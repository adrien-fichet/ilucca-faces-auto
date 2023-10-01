import fs from 'fs'

async function globalSetup() {
  if (!fs.existsSync('./user.json')) {
    // Create a user.json file with an empty object if it does not exist
    fs.writeFileSync('./user.json', '{}')
  }
}

export default globalSetup
