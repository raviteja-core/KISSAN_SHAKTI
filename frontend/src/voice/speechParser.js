export const parseSpeechText = (text) => {
  const textLower = text.toLowerCase();
  
  const skillMap = {
    'harvesting': 'Harvesting',
    'harvest': 'Harvesting',
    'cut': 'Harvesting',
    'cutting': 'Harvesting',
    'tractor': 'Tractor Driving',
    'driving': 'Tractor Driving',
    'driver': 'Tractor Driving',
    'sowing': 'Sowing',
    'sow': 'Sowing',
    'plant': 'Sowing',
    'planting': 'Sowing',
    'till': 'Soil Tilling',
    'tilling': 'Soil Tilling',
    'plow': 'Soil Tilling',
    'plowing': 'Soil Tilling',
    'pruning': 'Pruning',
    'prune': 'Pruning',
    'trimming': 'Pruning',
    'irrigation': 'Irrigation',
    'water': 'Irrigation',
    'watering': 'Irrigation'
  };

  const skillsFound = [];
  Object.keys(skillMap).forEach(key => {
    if (textLower.includes(key)) {
      const standardSkill = skillMap[key];
      if (!skillsFound.includes(standardSkill)) {
        skillsFound.push(standardSkill);
      }
    }
  });

  const phoneMatch = text.replace(/[\s\-_]/g, '').match(/\d{10}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  let rate = '';
  const rateMatch = textLower.match(/(?:wage|rate|pay|payout|₹|rupees|rupee)\s*(\d{3,4})/) || 
                    textLower.match(/(\d{3,4})\s*(?:wage|rate|pay|payout|rupees|rupee)/) ||
                    textLower.match(/(?:daily|cost)\s*(\d{3,4})/);
  if (rateMatch) {
    rate = rateMatch[1];
  } else {
    const numbers = text.match(/\b\d{3,4}\b/g);
    if (numbers) {
      rate = numbers[0];
    }
  }

  let name = '';
  const nameMatch = text.match(/(?:worker|laborer|labourer|labor|labour|name|register)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch) {
    name = nameMatch[1];
  } else {
    const capitalizedWords = text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/);
    if (capitalizedWords) {
      name = capitalizedWords[0];
    }
  }

  let location = '';
  const locMatch = text.match(/(?:in|at|near|location)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+Village|\s+Region|\s+Field)?)/i);
  if (locMatch) {
    location = locMatch[1];
  } else {
    if (textLower.includes('pimplad')) location = 'Pimplad Village';
    else if (textLower.includes('sinnar')) location = 'Sinnar Region';
    else if (textLower.includes('nashik')) location = 'Nashik District';
  }

  let title = '';
  const titleMatch = text.match(/(?:post|task|job|work)\s+([^,.]+)/i);
  if (titleMatch) {
    title = titleMatch[1];
  } else {
    if (skillsFound.length > 0) {
      title = `${skillsFound[0]} Task`;
    }
  }

  return {
    name: name ? name.trim() : '',
    phone: phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : '',
    rate: rate || '',
    skills: skillsFound,
    location: location ? location.trim() : '',
    title: title ? title.trim() : '',
    desc: text.slice(0, 100) + (text.length > 100 ? '...' : '')
  };
};
