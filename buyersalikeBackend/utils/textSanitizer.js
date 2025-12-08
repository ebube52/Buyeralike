function sanitizeText(inputText) {

    if (!inputText) {
        return "";
    }

    // Create a copy of the inputText to preserve the original case
    let sanitizedText = inputText.slice();

    // Convert input text to lowercase for checking
    let sanitizedTextLowerCase = inputText.toLowerCase();

    // Define profanity and abusive words list
    const profanityAbusiveList = ['ass', 'bastard', 'bitch', 'bullshit', 'cock', 'cunt', 'damn', 'dick', 'fuck', 'hell', 
        'motherfucker', 'nigger', 'piss', 'pussy', 'shit', 'slut', 'twat', 'whore', 'idiot', 'stupid', 'moron', 
        'arsehole', 'kpekus', 'douchebag', 'wanker', 'asswipe', 'dickhead', 'son of a bitch', 'cocksucker', 'fuckwit', 
        'shithead', 'prick', 'bollocks', 'bitchass'
    ];

    // Array to store positions where replacements occur
    let replacementPositions = [];

    // Replace profanity and abusive words while keeping track of replacement positions
    profanityAbusiveList.forEach(word => {
        const regex = new RegExp(`\\b\\s*${word.split('').join('\\s*')}\\b`, 'gi');
        let match;
        while ((match = regex.exec(sanitizedTextLowerCase)) !== null) {
            for (let i = match.index; i < match.index + word.length; i++) {
                sanitizedText = sanitizedText.substr(0, i) + '*' + sanitizedText.substr(i + 1);
            }
            replacementPositions.push(match.index);
        }
    });

    // Define regular expression for personal information
    const personalInfoRegex = /\b(?:\w+(?:[.-]?\w+)*@[a-zA-Z_]+?\.[a-zA-Z]{2,6}\s*|\s*(?:\+\d{1,2}\s?)?(?:\(\d{3,5}\)|\d{3,5})\s?\d{3,4}(?:\s?-\s?\d{3,4})?\s*|\s*\d{9,}\s*)\b/g;

    // Replace personal information while keeping track of replacement positions
    let match;
    while ((match = personalInfoRegex.exec(sanitizedTextLowerCase)) !== null) {
        for (let i = match.index; i < match.index + match[0].length; i++) {
            sanitizedText = sanitizedText.substr(0, i) + '*' + sanitizedText.substr(i + 1);
        }
        replacementPositions.push(match.index);
    }

    // Restore the original case of the remaining text
    for (let i = 0; i < inputText.length; i++) {
        if (!replacementPositions.includes(i)) {
            // Restore the original case of the character
            sanitizedText = sanitizedText.substr(0, i) + inputText[i] + sanitizedText.substr(i + 1);
        }
    }

    return sanitizedText;
}

module.exports = {
    sanitizeText
};
