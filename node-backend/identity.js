const User = require('./models/User');

function normalizePhone(value) {
  return value.replace(/[\s().-]/g, '').replace(/^(?:\+91|91)(?=\d{10}$)/, '');
}

function normalizeIdentity({ email, anonymousAlias, phone }) {
  return {
    email: (email || '').trim().toLowerCase(),
    anonymousAlias: (anonymousAlias || '').trim().normalize('NFKC').toLowerCase(),
    phone: normalizePhone((phone || '').trim())
  };
}

async function prepareUserIndexes() {
  const fields = ['email', 'anonymousAlias', 'phone'];
  const seen = Object.fromEntries(fields.map(field => [field, new Set()]));
  const updates = [];
  for await (const user of User.find().select(fields.join(' ')).lean().cursor()) {
    const identity = normalizeIdentity(user);
    for (const field of fields) {
      if (!identity[field] || seen[field].has(identity[field])) {
        throw new Error(`Existing accounts have a missing or duplicate normalized ${field}. Resolve the records before starting Campus Connect.`);
      }
      seen[field].add(identity[field]);
    }
    if (fields.some(field => identity[field] !== user[field])) {
      updates.push({ updateOne: { filter: { _id: user._id }, update: { $set: identity } } });
    }
  }
  if (updates.length) await User.bulkWrite(updates);
  await User.createIndexes();

  // Previous releases required a unique registration number. Those
  // indexes reject a second account created without one.
  for (const index of await User.collection.indexes()) {
    if (!index.unique || Object.keys(index.key).length !== 1 || !index.key.regNo) continue;
    try {
      await User.collection.dropIndex(index.name);
    } catch (error) {
      if (error.code !== 27) throw error; // Another instance may have removed it.
    }
  }
}

module.exports = { normalizeIdentity, prepareUserIndexes };
