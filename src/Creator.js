const chalk = require("chalk");
const inquirer = require("inquirer");
const fs = require("fs-extra");
const os = require("os");
const execa = require("execa");
const Metalsmith = require("metalsmith");
const async = require("async");
const path = require("path");
const ora = require("ora");
const { handlebars } = require("consolidate");

const pkg = require("../package.json");
const repos = require("./contants/repos");
const installDeps = require("./utils/installDeps");

function template(files, metalsmith, done) {
  const keys = Object.keys(files);
  const metadata = metalsmith.metadata();

  async.each(keys, run, done);

  function run(file, done) {
    const str = files[file].contents.toString();
    handlebars.render(str, metadata, (err, res) => {
      if (err) return done(err);
      files[file].contents = Buffer.from(res);
      done();
    });
  }
}

class Creator {
  constructor(name, targetDir) {
    this.options = {
      name: name,
      description: "",
    };

    this.name = name;
    // 当前根目录
    this.context = targetDir;
  }

  async create(cliOptions = {}) {
    const { name, context } = this;
    let { repo } = cliOptions;

    const packageManager = cliOptions.packageManager || "yarn";

    repo = await this.resolveTemplatePrompt(repo);

    const spinner = ora(`✨  Creating project in ${chalk.yellow(context)}`);
    spinner.start();

    const tmp = path.resolve(os.tmpdir(), name);

    try {
      await fs.remove(tmp);

      console.log();
      console.log(chalk.cyan(`🗃  start to download project template...`));
      await execa("git", ["clone", repo, tmp, "--depth", "1"]);
      await fs.remove(path.resolve(tmp + ".git"));
    } catch (e) {
      console.log(e);
      spinner.stop();
      return;
    }

    let author;
    let email;

    try {
      author = (await execa("git", ["config", "--get", "user.name"])).stdout;
      email = (await execa("git", ["config", "--get", "user.email"])).stdout;
    } catch (e) {}

    author = author ? author.toString().trim() : "";
    email = email ? ` <${email.toString().trim()}> ` : "";

    Metalsmith(__dirname)
      .metadata({
        name,
        author,
        email,
        description: `${pkg.name} project`,
      })
      .source(path.join(tmp, "template"))
      .destination(context)
      .use(template)
      .build(async (err) => {
        try {
          if (err) throw err;
          // if (isFrontendProject) {
          //   const pkgFile = path.join(dest, "package.json");
          //   const pkg = require(pkgFile);
          //   //   pkg.dependencies = sortObj({
          //   //     ...pkg.dependencies,
          //   //     ...DEPS[cssPreprocessor],
          //   //   });
          //   pkg.browserslist =
          //     platform === "mobile"
          //       ? ["Android >= 4", "iOS >= 9"]
          //       : ["Chrome 50"];
          //   await fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2));
          // }
          spinner.stopAndPersist({ symbol: "✨ " });
          console.log(`📦  Installing dependencies...`);
          await execa("git", ["init"], { cwd: context });
          // 像 husky 这样的 package 需要在git init之后安装才有用
          await installDeps(context);
          await execa("git", ["add", "-A"], { cwd: context });
          await execa(
            "git",
            ["commit", "-m", "feat(init): first commit :tada:"],
            { cwd: context }
          );
          console.log();
          console.log(
            `Successfully created project ${chalk.yellow(this.options.name)}.`
          );
          console.log(`👉  Get started with the following commands:\n\n`);
          console.log(
            chalk.cyan(` ${chalk.gray("$")} cd ${this.options.name}`)
          );
          console.log(chalk.cyan(` ${chalk.gray("$")} yarn start`));
        } catch (e) {
          console.log(e);
          spinner.stop();
        }
      });
  }

  async resolveTemplatePrompt(repo) {
    if (!repo) {
      repo = (
        await inquirer.prompt([
          {
            name: "repo",
            type: "list",
            message: "Pick a type for your application",
            choices: [
              {
                name: "Library",
                value: repos.LibraryRepo,
              },
            ],
          },
        ])
      ).repo;
    }

    return repo;
  }
}

module.exports = Creator;
