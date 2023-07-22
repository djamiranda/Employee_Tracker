const inquirer = require("inquirer");
const mysql = require("mysql2/promise");
const logo = require("asciiart-logo");

require("dotenv").config();
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;

async function dbConnection(select) {
  try {
    const db = await mysql.createConnection({
      host: "127.0.0.1",
      user: dbUser,
      password: dbPassword,
      database: dbName,
    });

    let returnedRowsFromDb = [];
    let returnedOutputFromInq = [];
    
    switch (select) {
      case "View All Departments":
        returnedRowsFromDb = await db.query("SELECT * FROM department");
        console.table(returnedRowsFromDb[0]); 
        break;

      case "View All Roles":
        returnedRowsFromDb = await db.query(`
                SELECT
                    role.id,
                    role.title,
                    role.salary,
                    department.name AS department
                FROM role
                JOIN department ON role.department_id = department.id
                `);
        console.table(returnedRowsFromDb[0]); 
        break;

        case "View All Employees":
            returnedRowsFromDb = await db.query(`
              SELECT
                employee.id,
                employee.first_name,
                employee.last_name,
                role.title AS title,
                department.name AS department,
                role.salary AS salary,
                CASE WHEN employee.manager_id IS NOT NULL THEN CONCAT(manager_table.first_name,' ', manager_table.last_name) ELSE NULL END AS manager
              FROM employee
              JOIN role ON employee.role_id = role.id
              JOIN department ON role.department_id = department.id
              LEFT JOIN employee manager_table ON employee.manager_id = manager_table.id
            `);
            console.table(returnedRowsFromDb[0]);
            break;
       
    }
  } catch (err) {
    console.log(err);
  }
}

console.log(logo({ name: "Employee Manager" }).render());

function userPrompt() {
  inquirer
    .prompt([
      {
        type: "list",
        name: "select",
        message: "What would you like to do?",
        choices: [
          "View All Departments",
          "View All Roles",
          "View All Employees",
          "Add Department",
          "Add Role",
          "Add Employee",
          "Update Employee Role",
          new inquirer.Separator(),
          "Exit",
        ],
      },
    ])
    .then(async (res) => {
      await dbConnection(res.select);
      res.select === "Exit" ? (console.table(logo({
        name: "Logout Successful",
    }).render()), process.exit()) : userPrompt();
    })
    .catch((err) => {
      if (err.isTtyError) {
      } else {
        console.error(err);
      }
    });
}

userPrompt();