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
            case "Add Department":
              returnedOutputFromInq = await inquirer.prompt([
              {
              name: "department",
              message: "What is the name of the department?",
              },
              ]);
              try {
              const { department } = returnedOutputFromInq;
      
              const existingDepartment = await db.query(
              `SELECT * FROM department WHERE name = '${department}'`
              );
      
              if (existingDepartment[0].length > 0) {
            console.log("Department already exists");
            break;
              }
      
            returnedRowsFromDb = await db.query(
            `INSERT INTO department (name) VALUES ('${department}')`
              );
            console.log("Added", department, "to the database");
            } catch (error) {
            console.log("Error adding department:", error);
            }
            break;
            case "Add Role":
              returnedOutputFromInq = await inquirer.prompt([
                {
                  name: "roleName",
                  message: "What is the name of the role?",
                },
                {
                  name: "roleSalary",
                  message: "What is the salary of the role?",
                },
                {
                  name: "roleDepartment",
                  message: "Which department does the role belong to?",
                },
              ]);
      
              const { roleName, roleSalary, roleDepartment } = returnedOutputFromInq;
      
              const returnDepartmentId = await db.query(
                'SELECT IFNULL((SELECT id FROM department WHERE name = ?), "Department Does Not Exist")',
                [roleDepartment]
              );
      
              const [rows] = returnDepartmentId;
              const department_id = Object.values(rows[0])[0];
      
              if (department_id === "Department Does Not Exist") {
                console.log("Enter a Role in an Existing Department!");
                break;
              }
      
              returnedRowsFromDb = await db.query(
                ` INSERT INTO role (title, salary, department_id) VALUES ('${roleName}', '${roleSalary}', '${department_id}');`
              );
      
              break;
              case "Add Employee":
                returnedOutputFromInq = await inquirer.prompt([
                  {
                    name: "first_name",
                    message: "What is the employees first name?",
                  },
                  {
                    name: "last_name",
                    message: "What is the employees last name?",
                  },
                  {
                    name: "role",
                    message: "What is the employees role?",
                  },
                  {
                    name: "manager",
                    message: "Who is the employees manager?",
                  },
                ]);
        
                const allRoles = await db.query("SELECT * FROM role;");
        
                const allManagers = await db.query(
                  "SELECT * FROM employee where manager_id is null;"
                );
        
                const { first_name, last_name, role, manager } = returnedOutputFromInq;
        
                const role_data = allRoles[0].filter((r) => {
                  return r.title === role;
                });
        
                const manager_data = allManagers[0].filter((m) => {
                  return `${m.first_name} ${m.last_name}` === manager;
                });
        
                returnedRowsFromDb = await db.query(
                  `INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ('${first_name}', '${last_name}', ${role_data[0].id}, ${manager_data[0].id})`
                );
        
                break;
        
              case "Update Employee Role":
                currentEmployees = await db.query(`
                        SELECT id, first_name, last_name FROM employee;`);
        
                currentRoles = await db.query(`
                        SELECT id, title FROM role;`);
        
                const employeeList = currentEmployees[0].map((employee) => {
                  return {
                    name: `${employee["first_name"]} ${employee.last_name}`,
                    value: employee.id,
                  };
                });
        
                const roleList = currentRoles[0].map((role) => {
                  return {
                    name: role.title,
                    value: role.id,
                  };
                });
        
                returnedOutputFromInq = await inquirer.prompt([
                  {
                    type: "list",
                    name: "employeeId",
                    message: "Which employees role do you want to update?",
                    choices: employeeList,
                  },
                  {
                    type: "list",
                    name: "newRole",
                    message: "Which role do you want to assign the selected employee?",
                    choices: roleList,
                  },
                ]);
        
                  console.log("Updated employees role");
                returnedRowsFromDb = await db.query(`
                            UPDATE employee
                            SET role_id = ${returnedOutputFromInq.newRole}
                            WHERE employee.id = ${returnedOutputFromInq.employeeId};`);
        
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