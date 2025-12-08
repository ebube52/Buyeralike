// config.js
const config = {
    serviceLimits: {
      basic: 3,
      standard: 10,
      premium: 30,
      partner: 10000,
      default: 0,
    },
    forumPostLimits: {
      basic: 3,
      standard: 20,
      premium: 50,
      partner: 1000,
      default: 0,
    },    
    groupPostLimits: {
      basic: 1,
      standard: 10,
      premium: 30,
      partner: 100,
      default: 0,
    },    
    groupLimits: {
      basic: 1,
      standard: 5,
      premium: 20,
      partner: 50,
      default: 0,
    },     
  };
  
  module.exports = config;
  