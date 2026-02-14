import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import Vault from "node-vault";

const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
	console.error(".env file not found at", envPath);
	process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath));

const VAULT_ADDR = process.env.VAULT_ADDR || "http://127.0.0.1:8200";
const VAULT_TOKEN = process.env.VAULT_TOKEN || "root"; 

const vault = Vault({
	apiVersion: "v1",
	endpoint: VAULT_ADDR,
	token: VAULT_TOKEN,
});

const MOUNT_POINT = "secret";
const SECRET_PATH = "data/medical-center";

async function migrateSecrets() {
	try {
		console.log(`Connecting to Vault at ${VAULT_ADDR}...`);

		try {
			await vault.mounts();
		} catch (e) {
			console.log("Could not list mounts, assuming default or insufficient permissions. Proceeding...");
		}

		console.log(`Writing secrets to ${MOUNT_POINT}/${SECRET_PATH}...`);
		
		await vault.write(`${MOUNT_POINT}/${SECRET_PATH}`, {
			data: envConfig,
		});

		console.log("Successfully migrated secrets to Vault!");
		console.log("Secrets written:");
		Object.keys(envConfig).forEach((key) => console.log(`- ${key}`));
	} catch (error) {
		console.error("Error migrating secrets to Vault:", error);
		process.exit(1);
	}
}

migrateSecrets();
