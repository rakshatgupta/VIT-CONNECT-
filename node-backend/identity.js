const User = require('./models/User');

function normalizePhone(value) {
  return value.replace(/[\s().-]/g, '').replace(/^(?:\+91|91)(?=\d{10}$)/, '');
}

function normalizeIdentity({ email, anonymousAlias, regNo, phone }) {
  return {
    email: (email || '').trim().toLowerCase(),
    anonymousAlias: (anonymousAlias || '').trim().normalize('NFKC').toLowerCase(),
    regNo: (regNo || '').trim().toUpperCase(),
    phone: normalizePhone((phone || '').trim())
  };
}

async function prepareUserIndexes() {
  const fields = ['email', 'anonymousAlias', 'regNo', 'phone'];
  const seen = Object.fromEntries(fields.map(field => [field, new Set()]));
  const updates = [];
  for await (const user of User.find().select(fields.join(' ')).lean().cursor()) {
    const identity = normalizeIdentity(user);
    for (const field of fields) {
      if (!identity[field] || seen[field].has(identity[field])) {
        throw new Error(`Existing accounts have a missing or duplicate normalized ${field}. Resolve the records before starting VIT Connect.`);
      }
      seen[field].add(identity[field]);
    }
    if (fields.some(field => identity[field] !== user[field])) {
      updates.push({ updateOne: { filter: { _id: user._id }, update: { $set: identity } } });
    }
  }
  if (updates.length) await User.bulkWrite(updates);
  await User.createIndexes();
}

module.exports = { normalizeIdentity, prepareUserIndexes };
