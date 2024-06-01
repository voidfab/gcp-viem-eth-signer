import { Hono } from 'hono'
import { createWalletClient, publicActions, http } from "viem"
import { toViem } from './modules'
import { mainnet } from 'viem/chains'
const app = new Hono()
// Identify the Key on the Key Ring to Use (Make sure to set this in the .env file)
// Also make sure to provide Service Account JSON Keyfile in the .env file
const cloudKey = process.env.RESOURCE_NAME as string
// Create a Wallet Client
const client = createWalletClient({
  account: await toViem(cloudKey),
  chain: mainnet,
  transport: http(process.env.RPC_URL),
}).extend(publicActions)
// Test a Route
app.get('/', async (c) => {
  const chainId = await client.getChainId()
  return c.text(`Account: ${client.account.address} ChainId: ${chainId}`)
})

export default app
