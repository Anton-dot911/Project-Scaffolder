#!/usr/bin/env node
import { Command } from "commander";
import { greet } from "./greet.ts";

const program = new Command("{{project_name}}")
  .description("TODO: one-line description of {{project_name}}")
  .argument("[name]", "who to greet", "world")
  .action((name: string) => {
    console.log(greet(name));
  });

program.parse();
