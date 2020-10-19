#!/usr/bin/env node

const commander = require("commander");
const program = new commander.Command();

// 初始化命令行
program.name("easy-cli").version("0.0.1").usage("<command> [options]");

program
  .command("create <name> [repo]")
  .description("create a new project")
  .action((name, repo) => {
    require("./create")({ name, repo });
  });

program.parse(process.argv);
