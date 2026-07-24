#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import React from 'react';
import prompts from 'prompts';
import { validateKey } from '../check.js'
import { agent } from '../ai/agent.js'
import { writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
const program = new Command();

    program
        .name('arxcli')
        .description('Hey ! thanks for testing this shit')
        .helpOption('-h, --help', 'Show the help section') 
        .helpCommand(false) 
        .addHelpText('after','\nThanks for using arxcli\nTo start the app write "arxcli login" inside your terminal.\nOur store : https://www.ar4x.store/\n')


    program.command('login')
    .description('login into arxcli')

    .action(async () => {

  console.log(chalk.hex('#22C55E').bold('\arxcli Terminal Chat'));
  
  let response = await prompts({
            type: 'password',   // hides input as they type, like a real password field
            name: 'apiKey',
            message: 'Please enter your API key:'
        });

  
  let checking = await prompts({
    type : 'confirm',
    name : "areusure",
    message: `is this your api key? - ${response.apiKey}`,
    initial: true
  })

  while(!checking.areusure) { 
    // start while here
    response = await prompts({
            type: 'password',   // hides input as they type, like a real password field
            name: 'apiKey',
            message: 'Please again enter your API key:'
    }); 

    checking = await prompts({
            type : 'confirm',
            name : "areusure",
            message: `is this your api key? - ${response.apiKey}`,
            initial: true
  })

  }


  const userHome = os.homedir();
  const result = await validateKey(response.apiKey)

  if (result.valid === true) {
    try {
      const content = `api_key=${response.apiKey}`;
      await writeFile(`${userHome}/.arxconfig`, content, 'utf8');

    console.log('File written successfully!');

  } catch (err) {
    console.error('Error writing file:', err);
  }
}
  console.log(result)
})


    program.command('run')
    .description('run arxcli')

    .action(async () => {
  const userHome = os.homedir();
  try {
    const data = await readFile(`${userHome}/.arxconfig`, 'utf8');
    const apiKey = data.split('=')[1].trim(); 
    const reuslt = await validateKey(apiKey)
    if (reuslt.valid === true) { 
      console.log(chalk.hex('#22C55E').bold('Welcome back to Arxcli!'));
      await import('tsx/esm');
      const { chat } = await import('../fancy.jsx');
      const { waitUntilExit } = chat();
      await waitUntilExit();
      
    }else{
      console.log(chalk.red('API key mismatch. Please login again.'));
    }
  } catch (err) {
    console.error('Error reading file:', err.message);
  }
})

program.parse(process.argv);