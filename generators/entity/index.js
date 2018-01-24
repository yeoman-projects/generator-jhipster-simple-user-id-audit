const glob = require('glob');
const chalk = require('chalk');
const packagejs = require('../../package.json');
const semver = require('semver');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');

const changeset = (changelogDate, entityTableName) =>
    `
    <!-- Added the entity audit columns -->
    <changeSet id="${changelogDate}-audit-1" author="jhipster-entity-audit">
        <addColumn tableName="${entityTableName}">
            <column name="created" type="timestamp" defaultValueDate="\${now}">
                <constraints nullable="false"/>
            </column>
            <column name="created_by" type="bigint">
                <constraints nullable="false"/>
            </column>
            <column name="modified" type="timestamp"/>
            <column name="modified_by" type="bigint"/>
        </addColumn>
    </changeSet>`;

module.exports = class extends BaseGenerator {
    get initializing() {
        return {
            init(args) {
                if (args === 'default') {
                    // do something when argument is 'default'
                }
            },
            readConfig() {
                this.entityConfig = this.options.entityConfig;
                this.jhipsterAppConfig = this.getJhipsterAppConfig();
                if (!this.jhipsterAppConfig) {
                    this.error('Can\'t read .yo-rc.json');
                }
            },
            displayLogo() {
                // it's here to show that you can use functions from generator-jhipster
                // this function is in: generator-jhipster/generators/generator-base.js
                // this.printJHipsterLogo();

                // Have Yeoman greet the user.
                this.log(`\nWelcome to the ${chalk.bold.yellow('JHipster simple-user-id-audit')} generator! ${chalk.yellow(`v${packagejs.version}\n`)}`);
            },
            checkJhipster() {
                const currentJhipsterVersion = this.jhipsterAppConfig.jhipsterVersion;
                const minimumJhipsterVersion = packagejs.dependencies['generator-jhipster'];
                if (!semver.satisfies(currentJhipsterVersion, minimumJhipsterVersion)) {
                    this.warning(`\nYour generated project used an old JHipster version (${currentJhipsterVersion})... you need at least (${minimumJhipsterVersion})\n`);
                }
            },
            validate() {
                // this shouldnt be run directly
                if (!this.entityConfig) {
                    this.env.error(`${chalk.red.bold('ERROR!')} This sub generator should be used only from JHipster and cannot be run directly...\n`);
                }
            },
        };
    }

    prompting() {
        // don't prompt if data are imported from a file
        if (this.entityConfig.useConfigurationFile === true && this.entityConfig.data && typeof this.entityConfig.data.enableEntityAudit !== 'undefined') {
            this.enableAudit = this.entityConfig.data.enableEntityAudit;
            return;
        }

        const done = this.async();
        const entityName = this.entityConfig.entityClass;
        const prompts = [{
            type: 'confirm',
            name: 'enableAudit',
            message: `Do you want to enable audit for this entity(${entityName})?`,
            default: true
        }];

        this.prompt(prompts).then((props) => {
            this.props = props;
            // To access props later use this.props.someOption;
            this.enableAudit = props.enableAudit;
            done();
        });
    }

    get writing() {
        return {
            updateFiles() {
                if (!this.enableAudit) {
                    return;
                }

                this.javaTemplateDir = 'src/main/java/package/';

                // read config from .yo-rc.json
                this.baseName = this.jhipsterAppConfig.baseName;
                this.packageName = this.jhipsterAppConfig.packageName;
                this.packageFolder = this.jhipsterAppConfig.packageFolder;
                this.clientFramework = this.jhipsterAppConfig.clientFramework;
                this.clientPackageManager = this.jhipsterAppConfig.clientPackageManager;
                this.buildTool = this.jhipsterAppConfig.buildTool;

                // use function in generator-base.js from generator-jhipster
                this.angularAppName = this.getAngularAppName();

                // use constants from generator-constants.js
                const javaDir = `${jhipsterConstants.SERVER_MAIN_SRC_DIR + this.packageFolder}/`;
                const resourceDir = jhipsterConstants.SERVER_MAIN_RES_DIR;
                // const webappDir = jhipsterConstants.CLIENT_MAIN_SRC_DIR;

                if (this.entityConfig.entityClass) {
                    this.log(`\n${chalk.bold.green('I\'m updating the entity for audit ')}${chalk.bold.yellow(this.entityConfig.entityClass)}`);

                    const entityName = this.entityConfig.entityClass;
                    this.changelogDate = this.entityConfig.changelogDate || this.dateFormatForLiquibase();

                    // extend entity with AbstractAuditingEntity
                    if (!this.fs.read(`${javaDir}domain/${entityName}.java`, {
                        defaults: ''
                    }).includes('extends AbstractAuditingEntity')) {
                        this.replaceContent(`${javaDir}domain/${entityName}.java`, `public class ${entityName}`, `public class ${entityName} extends AbstractAuditingEntity`);
                    }
                    // extend DTO with AbstractAuditingDTO
                    if (this.entityConfig.dto === 'mapstruct') {
                        if (!this.fs.read(`${javaDir}service/dto/${entityName}DTO.java`, {
                            defaults: ''
                        }).includes('extends AbstractAuditingDTO')) {
                            this.replaceContent(`${javaDir}service/dto/${entityName}DTO.java`, `public class ${entityName}DTO`, `public class ${entityName}DTO extends AbstractAuditingDTO`);
                        }
                    }
                    // update liquibase changeset
                    const file = glob.sync(`${resourceDir}/config/liquibase/changelog/*_added_entity_${entityName}.xml`)[0];
                    const entityTableName = this.entityConfig.entityTableName ? this.entityConfig.entityTableName : entityName;
                    this.addChangesetToLiquibaseEntityChangelog(file, changeset(this.changelogDate, this.getTableName(entityTableName)));
                }
            },
            updateConfig() {
                this.updateEntityConfig(this.entityConfig.filename, 'enableEntityAudit', this.enableAudit);
            }
        };
    }

    end() {
        if (this.enableAudit) {
            this.log(`\n${chalk.bold.green('Entity audit enabled')}`);
        }
    }
};
