import Vault from "node-vault";

const VAULT_ADDR = process.env.VAULT_ADDR || "http://localhost:8200";
const VAULT_TOKEN = process.env.VAULT_TOKEN || "root"; 
const vault = Vault({
	apiVersion: "v1",
	endpoint: VAULT_ADDR,
	token: VAULT_TOKEN,
});

const MOUNT_POINT = "secret";
const SECRET_PATH = "data/medical-center";

export async function getVaultSecrets() {
	try {
		const result = await vault.read(`${MOUNT_POINT}/${SECRET_PATH}`);
		return result.data.data;
	} catch (error) {
		console.warn("Failed to fetch secrets from Vault, falling back to process.env", error);
		return {};
	}
}
