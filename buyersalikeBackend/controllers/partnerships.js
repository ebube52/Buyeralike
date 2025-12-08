const asyncHandler = require('../middleware/async')
const ErrorResponse = require('../utils/errorResponse')
const models = require('../models');
const { createNotification } = require('../utils/notificationService');

// @desc    Express interest in an Opening (Create Partnership Intent)
// @route   POST /api/v1/partnerships/intent/:openingId
// @access  Protected (User)
exports.createPartnershipIntent = asyncHandler(async (req, res, next) => {
  const { openingId } = req.params;
  const userId = req.user.id; // From authenticated user

  // 1. Check if the Opening exists and is 'approved'
  const opening = await models.Opening.findByPk(openingId);
  if (!opening) {
    return next(new ErrorResponse(`Opening not found with ID ${openingId}`, 404));
  }

  if (!['verified', 'unverified'].includes(opening.status)) {
    return next(new ErrorResponse(`Cannot partner on an opening with status: ${opening.status}. Only 'approved' openings can be partnered on.`, 400));
  }

  // 2. Check if user already has an 'interested' or 'accepted_into_group' status for this opening
  const existingPartnership = await models.Partnership.findOne({
    where: {
      userId,
      openingId,
      status: {
        [models.Sequelize.Op.in]: ['interested', 'pending_group_join', 'accepted_into_group']
      }
    }
  });

  if (existingPartnership) {
    let message = "You have already expressed interest in this opening.";
    if (existingPartnership.status === 'accepted_into_group') {
      message = "You are already an active partner in a group for this opening.";
    } else if (existingPartnership.status === 'pending_group_join') {
        message = "You have a pending group join request for this opening.";
    }
    return next(new ErrorResponse(message, 400));
  }

  // 3. Create the new Partnership intent
  const partnershipIntent = await models.Partnership.create({
    userId,
    openingId,
    status: 'interested' // Initial status
  });

  // Notify the user who expressed interest
  await createNotification(
    userId,
    'partnership_interest_expressed',
    `Expressed interest in the opening: "${opening.title}".`,
    'Opening',
    openingId
  );

  // Notify the creator of the opening about new interest
  if (opening.userId !== userId) { // Avoid notifying self if opening creator also expresses interest
    await createNotification(
      opening.userId,
      'new_partnership_interest',
      `${req.user.firstName} ${req.user.lastName} has expressed interest in your opening: "${opening.title}".`,
      'Opening',
      openingId
    );
  }  

  res.status(201).json({
    success: true,
    data: partnershipIntent,
    message: "Partnership interest recorded successfully. You can now explore or form a partnership group."
  });
});

// @desc    Get all Partnership Groups for a specific Opening
// @route   GET /api/v1/partnerships/groups/:openingId
// @access  Protected (User) - Users can see groups on an opening
exports.getPartnershipGroupsForOpening = asyncHandler(async (req, res, next) => {
  const { openingId } = req.params;

  const partnershipGroups = await models.PartnershipGroup.findAll({
    where: { openingId },
    include: [
      {
        model: models.User,
        as: 'groupCreator',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: models.Partnership,
        as: 'memberships',
        attributes: ['id', 'userId', 'status', 'roleInGroup'],
        include: {
            model: models.User,
            as: 'partner',
            attributes: ['id', 'firstName', 'lastName']
        }
      }
    ],
    order: [['createdAt', 'ASC']]
  });

  res.status(200).json({
    success: true,
    count: partnershipGroups.length,
    data: partnershipGroups
  });
});

// @desc    Create a new Partnership Group for an Opening
// @route   POST /api/v1/partnerships/groups/:openingId
// @access  Protected (User) - Only users who have expressed interest might do this
exports.createPartnershipGroup = asyncHandler(async (req, res, next) => {
  const { openingId } = req.params;
  const userId = req.user.id; // Group creator
  const { name, description, maxMembers } = req.body;

  // Ensure the user has expressed interest in this opening first (optional, but good practice)
  const userPartnershipIntent = await models.Partnership.findOne({
    where: {
      userId,
      openingId,
      status: {
        [models.Sequelize.Op.in]: ['interested', 'pending_group_join', 'accepted_into_group']
      }
    }
  });

  if (!userPartnershipIntent) {
    return next(new ErrorResponse("You must express interest in this opening before creating a group.", 400));
  }

  // You might want to prevent a user from creating multiple groups for the same opening,
  // or joining a group if they've already created one, etc. (more complex logic here)

  const newGroup = await models.PartnershipGroup.create({
    openingId,
    creatorId: userId,
    name,
    description,
    maxMembers,
    status: 'forming'
  });

  // Update the user's initial 'interested' partnership to reflect their new group membership
  // Or create a new Partnership entry if they weren't yet `accepted_into_group` for this opening
  await userPartnershipIntent.update({
    partnershipGroupId: newGroup.id,
    status: 'accepted_into_group', // User is now a member of their own new group
    roleInGroup: 'creator' // Or 'leader'
  });

  const opening = await models.Opening.findByPk(openingId);

  await createNotification(
    userId,
    'partnership_group_created',
    `Created a new partnership group "${newGroup.name}" for opening "${opening ? opening.title : 'N/A'}".`,
    'PartnershipGroup',
    newGroup.id
  );  

  res.status(201).json({
    success: true,
    data: newGroup,
    message: `Partnership group '${newGroup.name}' created successfully, and you are its first member.`
  });
});

// @desc    Join an existing Partnership Group (send request)
// @route   POST /api/v1/partnerships/groups/:groupId/join
// @access  Protected (User)
exports.joinPartnershipGroup = asyncHandler(async (req, res, next) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  const partnershipGroup = await models.PartnershipGroup.findByPk(groupId);
  if (!partnershipGroup) {
    return next(new ErrorResponse(`Partnership Group not found with ID ${groupId}`, 404));
  }

  if (partnershipGroup.status !== 'forming') {
    return next(new ErrorResponse(`This partnership group is not currently accepting new members (status: ${partnershipGroup.status}).`, 400));
  }

  // Check if max members limit reached
  if (partnershipGroup.maxMembers) {
    const currentMembers = await models.Partnership.count({
      where: {
        partnershipGroupId: groupId,
        status: 'accepted_into_group'
      }
    });
    if (currentMembers >= partnershipGroup.maxMembers) {
      return next(new ErrorResponse("This partnership group has reached its maximum number of members.", 400));
    }
  }

  // Check if user already has an active partnership or pending request for this group/opening
  const existingPartnership = await models.Partnership.findOne({
    where: {
      userId,
      openingId: partnershipGroup.openingId, // Ensure it's for the same opening
      [models.Sequelize.Op.or]: [
        { status: 'pending_group_join', partnershipGroupId: groupId },
        { status: 'accepted_into_group', partnershipGroupId: groupId },
        { status: 'interested', partnershipGroupId: null } // User might have general interest
      ]
    }
  });

  if (existingPartnership) {
    if (existingPartnership.status === 'accepted_into_group' && existingPartnership.partnershipGroupId === groupId) {
      return next(new ErrorResponse("You are already a member of this group.", 400));
    }
    if (existingPartnership.status === 'pending_group_join' && existingPartnership.partnershipGroupId === groupId) {
      return next(new ErrorResponse("You already have a pending request to join this group.", 400));
    }
    // If user has general 'interested' status, update it
    await existingPartnership.update({
        partnershipGroupId: groupId,
        status: 'pending_group_join'
    });

    // Notify the user that their existing interest was updated to a request
    await createNotification(
      userId,
      'group_join_request_updated',
      `Interest in joining "${partnershipGroup.name}" has been updated to a pending request.`,
      'PartnershipGroup',
      groupId
    );

    // Notify the group creator about the new pending request
    await createNotification(
      partnershipGroup.creatorId,
      'new_group_join_request',
      `${req.user.firstName} ${req.user.lastName} wants to join your group "${partnershipGroup.name}".`,
      'PartnershipGroup',
      groupId
    );

    return res.status(200).json({
        success: true,
        data: existingPartnership,
        message: "Your existing interest has been updated to a pending request to join this group."
    });
  }

  // If no existing relevant partnership, create a new pending one
  const partnershipRequest = await models.Partnership.create({
    userId,
    openingId: partnershipGroup.openingId,
    partnershipGroupId: groupId,
    status: 'pending_group_join'
  });

  // Notify the user that their request was sent
  await createNotification(
    userId,
    'group_join_request_sent',
    `Request to join "${partnershipGroup.name}" has been sent. Awaiting approval.`,
    'PartnershipGroup',
    groupId
  );

  // Notify the group creator about the new pending request
  await createNotification(
    partnershipGroup.creatorId,
    'new_group_join_request',
    `${req.user.firstName} ${req.user.lastName} wants to join your group "${partnershipGroup.name}".`,
    'PartnershipGroup',
    groupId
  );  

  res.status(202).json({ // 202 Accepted for pending request
    success: true,
    data: partnershipRequest,
    message: "Request to join partnership group sent successfully. Awaiting approval."
  });
});


// @desc    Update Partnership Group status (e.g., closed_to_new_partners, active, completed)
// @route   PUT /api/v1/partnerships/groups/:groupId/status
// @access  Protected (Group Creator or Admin)
exports.updatePartnershipGroupStatus = asyncHandler(async (req, res, next) => {
  const { groupId } = req.params;
  const { status } = req.body;
  const userId = req.user.id; // Current user
  const isAdmin = req.user.role.includes('admin');

  const partnershipGroup = await models.PartnershipGroup.findByPk(groupId);
  if (!partnershipGroup) {
    return next(new ErrorResponse(`Partnership Group not found with ID ${groupId}`, 404));
  }

  // Authorization: Only the group creator or an admin can update the status
  if (partnershipGroup.creatorId !== userId && !isAdmin) {
    return next(new ErrorResponse(`Not authorized to update this partnership group's status`, 403));
  }

  // Validate new status value
  const validStatuses = ['forming', 'closed_to_new_partners', 'document_gathering', 'approvals_complete', 'active', 'on_hold', 'dispute', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return next(new ErrorResponse(`Invalid status provided. Must be one of: ${validStatuses.join(', ')}`, 400));
  }

  // Additional logic for specific status transitions could go here
  // e.g., if status is 'completed', all individual 'accepted_into_group' Partnerships should also be updated to 'group_completed'

  const oldStatus = partnershipGroup.status; 
  await partnershipGroup.update({ status });

  // If the group is completed or cancelled, update member partnerships
  if (status === 'completed' || status === 'cancelled') {
    const newMemberStatus = status === 'completed' ? 'group_completed' : 'group_cancelled';
    await models.Partnership.update(
        { status: newMemberStatus },
        {
            where: {
                partnershipGroupId: groupId,
                status: 'accepted_into_group' // Only update active members
            }
        }
    );

    // Notify all active members of the group status change
    if (partnershipGroup.memberships && partnershipGroup.memberships.length > 0) {
      for (const memberPartnership of partnershipGroup.memberships) {
        if (memberPartnership.userId !== userId) { // Don't notify the user who initiated the change twice
          await createNotification(
            memberPartnership.userId,
            `partnership_group_${status}`,
            `Partnership group "${partnershipGroup.name}" for "${partnershipGroup.opening ? partnershipGroup.opening.title : 'N/A'}" has been set to "${status}".`,
            'PartnershipGroup',
            groupId
          );
        }
      }
    }      
  }

  // Notify the user who performed the action
  await createNotification(
    userId,
    'partnership_group_status_updated',
    `Changed the status of group "${partnershipGroup.name}" from "${oldStatus}" to "${status}".`,
    'PartnershipGroup',
    groupId
  );

  res.status(200).json({
    success: true,
    data: partnershipGroup,
    message: `Partnership group status updated to '${status}'.`
  });
});

// @desc    Approve/Decline a user's request to join a Partnership Group
// @route   PUT /api/v1/partnerships/:partnershipId/status
// @access  Protected (Group Creator or Admin)
exports.updateUserPartnershipStatus = asyncHandler(async (req, res, next) => {
    const { partnershipId } = req.params;
    const { status } = req.body; // Expected status: 'accepted_into_group' or 'declined_by_group'
    const userId = req.user.id; // Current user
    const isAdmin = req.user.role.includes('admin');

    const partnershipToUpdate = await models.Partnership.findByPk(partnershipId, {
        include: [
            {
                model: models.PartnershipGroup,
                as: 'groupMembership',
                attributes: ['id', 'creatorId', 'maxMembers']
            },
            {
                model: models.Opening,
                as: 'openingParticipated',
                attributes: ['id', 'title']
            },
            {
                model: models.User,
                as: 'partner',
                attributes: ['id', 'firstName', 'lastName']
            }            
        ]
    });

    if (!partnershipToUpdate) {
        return next(new ErrorResponse(`Partnership entry not found with ID ${partnershipId}`, 404));
    }

    // Ensure this partnership entry is actually a pending request (Unless this is a Admin request)
    if (!isAdmin && (partnershipToUpdate.status !== 'pending_group_join')) {
        return next(new ErrorResponse(`Partnership entry is not in 'pending_group_join' status. Current status: ${partnershipToUpdate.status}`, 400));
    }

    // Authorization: Only the group creator or an admin can approve/decline
    const partnershipGroup = partnershipToUpdate.groupMembership;
    if (!partnershipGroup || (partnershipGroup.creatorId !== userId && !isAdmin)) {
        return next(new ErrorResponse(`Not authorized to update this user's partnership status for this group`, 403));
    }

    // Validate the new status
    if (!['accepted_into_group', 'declined_by_group'].includes(status)) {
        return next(new ErrorResponse(`Invalid status provided for user partnership. Must be 'accepted_into_group' or 'declined_by_group'`, 400));
    }

    // If accepting, check max members
    if (status === 'accepted_into_group') {
        if (partnershipGroup.maxMembers) {
            const currentMembers = await models.Partnership.count({
                where: {
                    partnershipGroupId: partnershipGroup.id,
                    status: 'accepted_into_group'
                }
            });
            if (currentMembers >= partnershipGroup.maxMembers) {
                return next(new ErrorResponse("This partnership group has reached its maximum number of members. Cannot accept more.", 400));
            }
        }
    }

    await partnershipToUpdate.update({ status });

    // Notify the user whose partnership status was updated
    let notificationMessageToPartner;
    let notificationTypeToPartner;

    if (status === 'accepted_into_group') {
      notificationMessageToPartner = `Request to join "${partnershipGroup.name}" for "${partnershipToUpdate.openingParticipated.title}" has been accepted!`;
      notificationTypeToPartner = 'group_join_accepted';
    } else { // declined_by_group
      notificationMessageToPartner = `Request to join "${partnershipGroup.name}" for "${partnershipToUpdate.openingParticipated.title}" has been declined.`;
      notificationTypeToPartner = 'group_join_declined';
    }

    await createNotification(
      partnershipToUpdate.userId,
      notificationTypeToPartner,
      notificationMessageToPartner,
      'Partnership',
      partnershipToUpdate.id
    );

    // Notify the group creator/admin who performed the action
    await createNotification(
      userId,
      'user_partnership_status_updated',
      `${status === 'accepted_into_group' ? 'accepted' : 'declined'} ${partnershipToUpdate.partner.firstName} ${partnershipToUpdate.partner.lastName}'s request for group "${partnershipGroup.name}".`,
      'Partnership',
      partnershipToUpdate.id
    );    

    res.status(200).json({
        success: true,
        data: partnershipToUpdate,
        message: `User's partnership status updated to '${status}'.`
    });
});

// @desc    Get a single Partnership Group by ID
// @route   GET /api/v1/partnerships/groups/:groupId
// @access  Protected (User) - Users can see group details
exports.getPartnershipGroup = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;

    const partnershipGroup = await models.PartnershipGroup.findByPk(groupId, {
      include: [
        {
          model: models.User,
          as: 'groupCreator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: models.Opening,
          as: 'opening',
          attributes: ['id', 'title']
        },
        {
          model: models.Partnership,
          as: 'memberships',
          attributes: ['id', 'userId', 'status', 'roleInGroup', 'createdAt'],
          where: {
            status: {
              [models.Sequelize.Op.in]: ['accepted_into_group', 'pending_group_join'] // Include pending requests for group creator
            }
          },
          required: false, // Don't require memberships to exist for the group to be returned
          include: {
              model: models.User,
              as: 'partner',
              attributes: ['id', 'firstName', 'lastName', 'email']
          }
        }
      ]
    });

    if (!partnershipGroup) {
      return next(new ErrorResponse(`Partnership Group not found with ID ${groupId}`, 404));
    }

    res.status(200).json({
      success: true,
      data: partnershipGroup
    });
});

// @desc    Get all Partnerships (individual intents/memberships) for the logged-in User
// @route   GET /api/v1/partnerships/me
// @access  Protected (User)
exports.getMyPartnerships = asyncHandler(async (req, res, next) => {
  const userId = req.user.id; // Assuming req.user.id is populated by your authentication middleware

  const myPartnerships = await models.Partnership.findAll({
    where: { userId },
    include: [
      {
        model: models.Opening,
        as: 'openingParticipated',
        attributes: ['id', 'title', 'description', 'image', 'status', 'userId']
      },
      {
        model: models.PartnershipGroup,
        as: 'groupMembership',
        attributes: ['id', 'name', 'status', 'maxMembers', 'creatorId'], // **Add creatorId here**
        include: [
          {
            model: models.User,
            as: 'groupCreator',
            attributes: ['id', 'firstName', 'lastName']
          },
          // **Crucially, include the memberships (Partnership records) within the group**
          {
            model: models.Partnership,
            as: 'memberships', // This 'as' must match the association defined in PartnershipGroup model
            attributes: ['id', 'userId', 'status'], // Include userId to check for existing member
            include: { // Include the partner (User) details for each membership
                model: models.User,
                as: 'partner', // This 'as' must match the association defined in Partnership model
                attributes: ['id', 'firstName', 'lastName']
            },
            required: false // Use false if you want the group even if it has no members
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({
    success: true,
    count: myPartnerships.length,
    data: myPartnerships
  });
});


// @desc    Get ALL Partnerships (for admin view)
// @route   GET /api/v1/partnerships/all
// @access  Protected (Admin)
exports.getAllPartnerships = asyncHandler(async (req, res, next) => {
  const allPartnerships = await models.Partnership.findAll({
    include: [
      {
        model: models.User,
        as: 'partner',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: true
      },
      {
        model: models.Opening,
        as: 'openingParticipated',
        attributes: ['id', 'title', 'description', 'image', 'status', 'slug'],
        required: true
      },
      {
        model: models.PartnershipGroup,
        as: 'groupMembership',
        attributes: ['id', 'name', 'status', 'maxMembers', 'creatorId', 'description', 'createdAt'],
        required: false,
        include: [
          {
            model: models.Opening,
            as: 'opening',
            attributes: ['id', 'title', 'slug', 'description', 'image'],
            required: true
          },
          {
            model: models.User,
            as: 'groupCreator',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: models.Partnership,
            as: 'memberships',
            attributes: ['id', 'userId', 'status', 'roleInGroup'],
            required: false,
            include: {
                model: models.User,
                as: 'partner',
                attributes: ['id', 'firstName', 'lastName', 'email']
            }
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({
    success: true,
    count: allPartnerships.length,
    data: allPartnerships
  });
});


// @desc    User withdraws interest or leaves a group
// @route   PUT /api/v1/partnerships/me/:partnershipId/withdraw
// @access  Protected (User)
exports.withdrawOrLeavePartnership = asyncHandler(async (req, res, next) => {
    const { partnershipId } = req.params;
    const userId = req.user.id;

    const partnership = await models.Partnership.findOne({
        where: { id: partnershipId, userId },
        include: [
            {
                model: models.PartnershipGroup,
                as: 'groupMembership',
                attributes: ['id', 'status', 'name', 'creatorId']
            },
            {
                model: models.Opening,
                as: 'openingParticipated',
                attributes: ['id', 'title']
            }        
        ]
    });

    if (!partnership) {
        return next(new ErrorResponse(`Partnership entry not found or you are not authorized to modify it.`, 404));
    }

    // Determine the new status based on current status
    let newStatus;
    let notificationMessage;
    let notificationType;
    let notifyGroupCreator = false;    

    if (partnership.status === 'interested' || partnership.status === 'pending_group_join') {
        newStatus = 'withdrawn_interest';
        notificationMessage = `You've withdrawn your interest in "${partnership.openingParticipated.title}".`;
        notificationType = 'partnership_interest_withdrawn';
    } else if (partnership.status === 'accepted_into_group') {
        newStatus = 'left_group';
        notificationMessage = `You've left the group "${partnership.groupMembership ? partnership.groupMembership.name : 'N/A'}" for "${partnership.openingParticipated.title}".`;
        notificationType = 'partnership_group_left';
        notifyGroupCreator = true; // Flag to notify group creator
    } else {
        return next(new ErrorResponse(`Cannot withdraw or leave from a partnership with current status: ${partnership.status}`, 400));
    }    

    await partnership.update({ status: newStatus });

    // Notify the user who performed the action
    await createNotification(
      userId,
      notificationType,
      notificationMessage,
      'Partnership',
      partnership.id
    );

    // If the user left a group, notify the group creator
    if (notifyGroupCreator && partnership.groupMembership && partnership.groupMembership.creatorId && partnership.groupMembership.creatorId !== userId) {
      await createNotification(
        partnership.groupMembership.creatorId,
        'group_member_left',
        `${req.user.firstName} ${req.user.lastName} has left your group "${partnership.groupMembership.name}" for opening "${partnership.openingParticipated.title}".`,
        'PartnershipGroup',
        partnership.groupMembership.id
      );
    }    

    res.status(200).json({
        success: true,
        data: partnership,
        message: `Partnership status updated to '${newStatus}'.`
    });
});