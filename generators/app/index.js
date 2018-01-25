const chalk = require('chalk');
const packagejs = require('../../package.json');
const semver = require('semver');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');

module.exports = class extends BaseGenerator {
    get initializing() {
        return {
            init(args) {
                if (args === 'default') {
                    // do something when argument is 'default'
                }
            },
            readConfig() {
                this.jhipsterAppConfig = this.getJhipsterAppConfig();
                if (!this.jhipsterAppConfig) {
                    this.error('Can\'t read .yo-rc.json');
                }
            },
            displayLogo() {
                // it's here to show that you can use functions from generator-jhipster
                // this function is in: generator-jhipster/generators/generator-base.js
                this.printJHipsterLogo();

                // Have Yeoman greet the user.
                this.log(`\nWelcome to the ${chalk.bold.yellow('JHipster simple-user-id-audit')} generator! ${chalk.yellow(`v${packagejs.version}\n`)}`);
            },
            checkJhipster() {
                const currentJhipsterVersion = this.jhipsterAppConfig.jhipsterVersion;
                const minimumJhipsterVersion = packagejs.dependencies['generator-jhipster'];
                if (!semver.satisfies(currentJhipsterVersion, minimumJhipsterVersion)) {
                    this.warning(`\nYour generated project used an old JHipster version (${currentJhipsterVersion})... you need at least (${minimumJhipsterVersion})\n`);
                }
            }
        };
    }

    prompting() {
        const prompts = [];

        const done = this.async();
        this.prompt(prompts).then((props) => {
            this.props = props;
            // To access props later use this.props.someOption;

            done();
        });
    }

    writing() {
        // function to use directly template
        this.template = function (source, destination) {
            this.fs.copyTpl(
                this.templatePath(source),
                this.destinationPath(destination),
                this
            );
        };

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
        const testDir = `${jhipsterConstants.SERVER_TEST_SRC_DIR + this.packageFolder}/`;
        const resourceDir = jhipsterConstants.SERVER_MAIN_RES_DIR;
        // const webappDir = jhipsterConstants.CLIENT_MAIN_SRC_DIR;

        this.javaTemplateDir = 'src/main/java/package/';

        // update config
        this.template(`${this.javaTemplateDir}security/_SpringSecurityAuditorAware.java`, `${javaDir}security/SpringSecurityAuditorAware.java`);
        this.template(`${this.javaTemplateDir}domain/_AbstractAuditingEntity.java`, `${javaDir}domain/AbstractAuditingEntity.java`);
        this.template(`${this.javaTemplateDir}service/dto/_AbstractAuditingDTO.java`, `${javaDir}service/dto/AbstractAuditingDTO.java`);
        this.template(`${this.javaTemplateDir}service/dto/_UserDTO.java`, `${javaDir}service/dto/UserDTO.java`);
        // update db
        const auditColumns = [
            {
                from: '<column name="created_by" type="varchar(50)"',
                to: '<column name="created_by" type="bigint"'
            },
            {
                from: '<column name="created_date" type="timestamp"',
                to: '<column name="created" type="timestamp"'
            },
            {
                from: '<column name="last_modified_by" type="varchar(50)"',
                to: '<column name="modified_by" type="bigint"'
            },
            {
                from: '<column name="last_modified_date" type="timestamp"',
                to: '<column name="modified" type="timestamp"'
            },
            {
                from: '<dropDefaultValue tableName="jhi_user" columnName="created_date"',
                to: '<dropDefaultValue tableName="jhi_user" columnName="created"'
            }
        ];
        auditColumns.forEach((column) => {
            this.replaceContent(`${resourceDir}/config/liquibase/changelog/00000000000000_initial_schema.xml`, column.from, column.to, false);
        });
        this.replaceContent(`${resourceDir}/config/liquibase/users.csv`, ';last_modified_by', ';modified_by', false);
        this.replaceContent(`${resourceDir}/config/liquibase/users.csv`, /;system;system/g, ';1;1', true);
        // update repository
        const repositoryFiles = [
            `${javaDir}repository/UserRepository.java`,
            `${javaDir}service/UserService.java`,
            `${testDir}service/UserServiceIntTest.java`
        ];
        repositoryFiles.forEach((fullPath) => {
            this.replaceContent(fullPath, /findAllByActivatedIsFalseAndCreatedDateBefore\(/g, 'findAllByActivatedIsFalseAndCreatedBefore(');
        });
        // update user test UserServiceIntTest
        const testFiles = [
            `${testDir}service/UserServiceIntTest.java`,
            `${testDir}web/rest/AccountResourceIntTest.java`,
            `${testDir}web/rest/UserResourceIntTest.java`
        ];
        const auditFields = [
            {
                from: /\.setCreatedDate\(/g,
                to: '.setCreated('
            },
            {
                from: /\.getCreatedDate\(\)/g,
                to: '.getCreated()'
            },
            {
                from: /\.setLastModifiedBy\(/g,
                to: '.setModifiedBy('
            },
            {
                from: /\.getLastModifiedBy\(\)/g,
                to: '.getModifiedBy()'
            },
            {
                from: /\.setLastModifiedDate\(/g,
                to: '.setModified('
            },
            {
                from: /\.getLastModifiedDate\(\)/g,
                to: '.getModified()'
            },
            {
                from: /\.setCreatedBy\(DEFAULT_LOGIN\)/g,
                to: '.setCreatedBy(DEFAULT_ID)'
            },
            {
                from: /\.setModifiedBy\(DEFAULT_LOGIN\)/g,
                to: '.setModifiedBy(DEFAULT_ID)'
            }
        ];
        testFiles.forEach((fullPath) => {
            auditFields.forEach((field) => {
                this.replaceContent(fullPath, field.from, field.to, true);
            });
        });

        // this.replaceContent(`${testDir}service/UserServiceIntTest.java`, 'private static final String UPDATED_LOGIN = "jhipster";', importDefaultLogin, false);

        try {
            this.registerModule('generator-jhipster-simple-user-id-audit', 'app', 'post', 'app', 'Custom simple audit using user id');
            this.registerModule('generator-jhipster-simple-user-id-audit', 'entity', 'post', 'entity', 'Custom simple audit using user id');
        } catch (err) {
            this.log(`${chalk.red.bold('WARN!')} Could not register as a jhipster entity post creation hook...\n`);
        }
    }

    install() {
        let logMsg =
            `To install your dependencies manually, run: ${chalk.yellow.bold(`${this.clientPackageManager} install`)}`;

        if (this.clientFramework === 'angular1') {
            logMsg =
                `To install your dependencies manually, run: ${chalk.yellow.bold(`${this.clientPackageManager} install & bower install`)}`;
        }
        const injectDependenciesAndConstants = (err) => {
            if (err) {
                this.warning('Install of dependencies failed!');
                this.log(logMsg);
            } else if (this.clientFramework === 'angular1') {
                this.spawnCommand('gulp', ['install']);
            }
        };
        const installConfig = {
            bower: this.clientFramework === 'angular1',
            npm: this.clientPackageManager !== 'yarn',
            yarn: this.clientPackageManager === 'yarn',
            callback: injectDependenciesAndConstants
        };
        if (this.options['skip-install']) {
            this.log(logMsg);
        } else {
            this.installDependencies(installConfig);
        }
    }

    end() {
        this.log('End of simple-user-id-audit generator');
    }
};
