const path = require("path");
const fs = require("fs-extra");
const inquirer = require("inquirer");
const chalk = require("chalk");

const Creator = require("./Creator");

async function create({ repo, name }) {
  // 获取文件的绝对路径
  const targetDir = path.resolve(process.cwd(), name);

  try {
    const exists = (await fs.stat(targetDir)).isDirectory();
    if (exists) {
      const { action } = await inquirer.prompt([
        {
          name: "action",
          type: "list",
          message: `Target directory ${chalk.cyan(
            targetDir
          )} already exists. Pick an action to continue:`,
          choices: [
            { name: "Overwrite", value: true },
            // { name: 'Merge', value: 'merge' },
            { name: "Cancel", value: false },
          ],
        },
      ]);

      if (action) {
        console.log(`\nRemoving ${chalk.cyan(targetDir)}...`);
        await fs.remove(targetDir);
      } else {
        return;
      }
    }
  } catch (error) {}

  const creator = new Creator(name, targetDir);
  await creator.create({
    repo,
  });
}

module.exports = create;
