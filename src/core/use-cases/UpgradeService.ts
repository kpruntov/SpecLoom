import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export class UpgradeService {
    constructor(private projectRoot: string) {}

    public async upgrade() {
        const specDir = join(this.projectRoot, '.spec');
        if (!existsSync(specDir)) {
            throw new Error("SpecLoom is not initialized. Run 'loom init' first.");
        }

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const assetsDir = resolve(__dirname, '../../assets');
        const pkgPath = resolve(__dirname, '../../../package.json');
        
        let cliVersion = 'unknown';
        if (existsSync(pkgPath)) {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            cliVersion = pkg.version;
        }

        if (!existsSync(assetsDir)) {
             throw new Error(`Could not find assets directory to upgrade .spec/core. Looked in: ${assetsDir}`);
        }

        // Backup existing core
        const coreDir = join(this.projectRoot, '.spec/core');
        if (existsSync(coreDir)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = join(this.projectRoot, `.spec/core_backup_${timestamp}`);
            renameSync(coreDir, backupDir);
            console.log(`Backed up existing .spec/core to ${backupDir}`);
        }

        // Copy new core assets
        mkdirSync(coreDir, { recursive: true });
        cpSync(join(assetsDir, 'schemas'), join(coreDir, 'schemas'), { recursive: true });
        cpSync(join(assetsDir, 'templates'), join(coreDir, 'templates'), { recursive: true });
        cpSync(join(assetsDir, 'roles'), join(coreDir, 'roles'), { recursive: true });

        // Update loom.config.json
        const configPath = join(this.projectRoot, '.spec/loom.config.json');
        let config: any = {};
        if (existsSync(configPath)) {
            config = JSON.parse(readFileSync(configPath, 'utf-8'));
        }
        config.version = cliVersion;
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        return { message: `SpecLoom project successfully upgraded to version ${cliVersion}.` };
    }
}