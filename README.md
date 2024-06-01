# GCP Viem ETH Signer

## Overview
`GCP Viem ETH Signer` is a Node.js module that provides functionality to transform GCP Key Management Service (KMS) credentials into Viem-compatible Ethereum accounts. This module allows you to interact with GCP KMS for secure signing operations using your Ethereum keys stored in the Google Cloud Platform.

## Features
- Retrieve public keys from GCP Key Ring.
- Sign hashes, messages, transactions, and typed data using GCP KMS.
- Recover signatures from signed hashes.
- Convert KMS credentials to Viem Ethereum accounts.
- Modular and reusable code design.

## Installation
Just clone and use as necessary, ill add an npm package when there is more functionality.

## Directory Structure
```
src/
  modules/
    gcpToViem.ts
    toViem.ts
  utils/
    asn1.ts
    gcp.ts
  global.d.ts
```

## Usage

### Function Documentation

*They pretty much do the same thing for right now, use toViem until I get around to adding additional methods*

#### `gcpToViem`

**Description**: Convert GCP Key Ring credentials to a Viem account.

**Parameters**:
- `param0`: An object containing the cloud key and the optional loaded KMS client.
  - `cloudKey` (string): The cloud key identifier.
  - `kmsClient` (KeyManagementServiceClient, optional): The KMS client.

**Returns**: A Promise that resolves to a `CloudDerivedAccount`.
---
#### `toViem`

**Description**: Converts a cloud key (resource name) to a Viem-compatible Ethereum account.

**Parameters**:
- `cloudKey` (string): The resource name of the cloud key to convert.

**Returns**: A Promise that resolves to a `CloudDerivedAccount` object which includes Ethereum account details derived from the GCP KMS.

---
### Example from `./src/index.ts`

Here's a simple example located in `./src/index.ts`:

```typescript
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

// Returns Account: 0x... ChainId: 1

```

## Contributing
Contributions are welcome! If you'd like to contribute, please fork the repository, make your changes, and submit a pull request.

## License
This project is licensed under the MIT License.

## Acknowledgements
- [Google Cloud KMS](https://cloud.google.com/kms)
- [Viem](https://github.com/viem/viem)
- [ASN1.js](https://github.com/PeculiarVentures/ASN1.js/)
