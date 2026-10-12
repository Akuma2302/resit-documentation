// MongoDB ids are 24 hex characters. Looking up anything else makes the driver throw,
// so invalid input is swapped for an id that can never match and the lookup returns nothing.
const NO_MATCH = '000000000000000000000000'

const isId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)

const toId = (value) => (isId(value) ? value : NO_MATCH)

module.exports = { isId, toId }
