// Import required modules
const fs = require('fs');               // File system module for reading files
const { parse } = require('csv-parse'); // CSV parsing module
const express = require('express');     // Express.js for creating a web server
const inquirer = require('inquirer');   // Inquirer.js for interactive command-line prompts
const prompt = inquirer.createPromptModule(); // Create a prompt module using Inquirer

const app = express();
const port = 3001;
// app.use(express.json());


let distributorInformation = [];
let geoData

// The main function that initializes the program.
// Reads CSV file, initializes geoData, asks questions to the use
async function main() {
    const csvFilePath = '\cities.csv';
    geoData = await parseCSVFile(csvFilePath)
    await askNextQuestion();
    console.log("Exiting the program");


}

//Parse a CSV file and group records by country, states and cities in the state.
async function parseCSVFile(csvFilePath) {

    return new Promise((resolve, reject) => {

        // Read the CSV file using fs
        fs.readFile(csvFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
                reject(err);
            }

            // Parse the CSV content using csv-parse
            parse(data, {
                columns: true, // Treat the first row as headers
                skip_empty_lines: true // Skip empty lines
            }, (err, records) => {
                if (err) {
                    console.error('Error parsing the CSV:', err);
                    return;
                }

                // Group records by country and province
                const groupedData = records.reduce((acc, city) => {
                    const countryIndex = acc.findIndex(item => item.country === city['Country Name'].toUpperCase());

                    if (countryIndex === -1) {
                        // If country doesn't exist, add it with the first state and city
                        acc.push({
                            country: city['Country Name'].toUpperCase(),
                            states: [
                                {
                                    state: city['Province Name'].toUpperCase(),
                                    cities: [city['City Name'].toUpperCase()]
                                }
                            ]
                        });
                    } else {
                        const stateIndex = acc[countryIndex].states.findIndex(item => item.state === city['Province Name'].toUpperCase());
                        if (stateIndex === -1) {
                            // If state doesn't exist, add it with the first city
                            acc[countryIndex].states.push({
                                state: city['Province Name'].toUpperCase(),
                                cities: [city['City Name'].toUpperCase()]
                            });
                        } else {
                            // State exists, add the city to the existing state
                            acc[countryIndex].states[stateIndex].cities.push(city['City Name'].toUpperCase());
                        }
                    }
                    return acc;
                }, []);
                resolve(groupedData);

            });
        });
    })
}

// Asynchronous function to prompt the user with a list of choices and perform actions based on user input.
// Continues to prompt the user until the program is exited.
async function askNextQuestion() {
    while (true) {
        try {

            const questions = [
                {
                    type: 'list',
                    name: 'NewDistributor',
                    message: 'Select one of the below choices :\n',
                    choices: ['Create a new distributor', 'Create a sub distributor',
                        "Check permission for a distributor", "View Distributors information", "Exit the program"]
                }
            ];

            const getDistributorDataQuestions = [
                {
                    type: 'input',
                    name: 'name',
                    message: 'Enter distributor name: \n'
                },
                {
                    type: 'input',
                    name: 'include',
                    message: 'Enter the regions you want to include for this distributor :\n'
                },
                {
                    type: 'input',
                    name: 'exclude',
                    message: 'Enter the regions you want to exclude for this distributor :\n'
                }]
            const getSubDistributorDataQuestions = [
                {
                    type: 'input',
                    name: 'name',
                    message: 'Enter distributor name: '
                },
                {
                    type: 'input',
                    name: 'include',
                    message: 'Enter the regions you want to include for this distributor :\n'
                },
                {
                    type: 'input',
                    name: 'exclude',
                    message: 'Enter the regions you want to exclude for this distributor :\n'
                },
                {
                    type: 'input',
                    name: 'parentName',
                    message: 'Enter the name of the parent distributor :\n'
                }]
            const checkPermissionData = [
                {
                    type: 'input',
                    name: 'distributorName',
                    message: 'Enter distributor name that need to checked:\n'
                }, {
                    type: 'input',
                    name: 'testData',
                    message: 'Enter regions that need to checked:\n'
                }]
            const answer = await prompt(questions);
            if (answer.NewDistributor == "Create a new distributor") {
                const distributorData = await prompt(getDistributorDataQuestions);
                let errors = validateDistributorData(distributorData);
                if (errors.length > 0) {
                    console.error("Validation errors:", errors);
                    continue;
                }
                let distributorObject = createNewDistributor(distributorData)
                distributorInformation.push(distributorObject)


            } else if (answer.NewDistributor == "Create a sub distributor") {
                const subDistributorData = await prompt(getSubDistributorDataQuestions);
                let errors = validateSubDistributorData(subDistributorData);
                if (errors.length > 0) {
                    console.error("Validation errors:", errors);
                    continue;
                }
                let parentDistributorData = getDistributorData(subDistributorData.parentName.toUpperCase())
                console.log("parentDistributorData.exclude.length :", parentDistributorData.exclude)
                console.log("parentDistributorData.exclude.length :", parentDistributorData.exclude.length)
                if (parentDistributorData.exclude.length != 0) {

                    subDistributorData.exclude = subDistributorData.exclude != "" ?
                        subDistributorData.exclude + ',' + parentDistributorData.exclude.join() : parentDistributorData.exclude.join();
                    console.log("subDistributorData.exclude :", subDistributorData.exclude)
                }

                let subDistributorObject = createNewDistributor(subDistributorData, subDistributorData.parentName.toUpperCase())

                distributorInformation.push(subDistributorObject)

            } else if (answer.NewDistributor == "Check permission for a distributor") {
                let errorMsg = []
                const checkData = await prompt(checkPermissionData);
                let errors = validateCheckPermissionData(checkData)
                if (errors.length > 0) {
                    console.error("Validation errors:", errors);
                    continue;
                }
                testData = checkData.testData.toUpperCase().split(',')
                let checkPermssionResult = checkPermission(checkData.distributorName.trim(), testData, "checkDistibutorPermission")
                console.log("checkPermssionResult :", checkPermssionResult)



            } else if (answer.NewDistributor == "View Distributors information") {
                displayDistributorInformation()
            } else if (answer.NewDistributor == "Exit the program") {
                // Resolve to exit the loop
                process.exit(0);

            }

        } catch (err) {
            console.error("Error in askNextQuestion():", err);
            // Don't resolve; continue to the next iteration of the loop
            continue;
        }
    }


}

// Validate distributor data to ensure it meets the required criteria.
// validateDistributorData function checks if the distributor name is not empty, unique, and if include and exclude regions are valid based on the geoData array.
function validateDistributorData(data) {
    let errorMsg = []
    if (data.name.trim() == '') {
        errorMsg.push("Distributor Name must not be empty, please enter a valid distributor name")
    } else if (validateDistributorName(data.name.trim().toUpperCase())) {
        errorMsg.push("Distributor Name already exists")
    }

    if (data.include.trim() == '') {
        errorMsg.push("Include Regions must not be empty, please enter a valid regions")
    } else if (!validateRegions(data.include.trim())) {
        errorMsg.push("Include Region is not present in csv, please enter a valid region")
    }

    if (data.exclude.trim() != '') {
        if (!validateRegions(data.exclude.trim())) {
            errorMsg.push("Exclude Region is not present in csv, please enter a valid region")
        }
    }


    return errorMsg;
}


// Validate sub-distributor data to ensure it meets the required criteria.
// This function checks if the distributor name is not empty, unique, if include and exclude regions are valid based on the geoData array,
// and if the parent distributor exists. If validation passes, it also checks permissions with the parent distributor.
function validateSubDistributorData(data) {
    console.log("data :", data)
    let errorMsg = []
    if (data.name.trim() == '') {
        errorMsg.push("Distributor Name must not be empty, please enter a valid distributor name")
    } else if (validateDistributorName(data.name.trim().toUpperCase())) {
        errorMsg.push("Distributor Name already exists")
    }

    if (data.include.trim() == '') {
        errorMsg.push("Include Regions must not be empty, please enter a valid regions")
    } else if (!validateRegions(data.include.trim())) {
        errorMsg.push("Include Region is not present in csv, please enter a valid region")
    }

    if (data.exclude.trim() != '') {
        if (!validateRegions(data.exclude.trim())) {
            errorMsg.push("Exclude Region is not present in csv, please enter a valid region")
        }
    }

    if (data.parentName.trim() == '') {
        errorMsg.push("Parent distributor Name must not be empty, please enter a valid parent distributor name")
    } else if (!validateDistributorName(data.parentName.trim().toUpperCase())) {
        errorMsg.push("Parent distributor Name does not exists, please enter existing parent distributor name")
    }
    if (errorMsg.length == 0) {

        let testData = data.exclude.trim() != '' ?
            (data.include.trim() + ',' + data.exclude.trim()).toUpperCase().split(',')
            : data.include.trim().toUpperCase().split(',')
        let checkPermissionWithParent = checkPermission(data.parentName.trim(), testData, "subDistributionCreation")
        if (checkPermissionWithParent.length > 0) {
            errorMsg = [...errorMsg, ...checkPermissionWithParent];
        }

    }


    return errorMsg;
}

//  Validate distributor name to ensure it is unique.
function validateDistributorName(distributorName) {
    if (distributorInformation.length > 0) {
        for (let i = 0; i < distributorInformation.length; i++) {
            if (distributorInformation[i].distributorName === distributorName) {
                return true;
            }
        }
        return false;
    } else {
        return false;
    }
}


// Validate regions based on the provided data.
// validateRegions function checks if the specified regions exist in the geoData array(csv file data).
function validateRegions(data) {
    splitTestData = data.split(',')
    for (let i = 0; i < splitTestData.length; i++) {
        let testData = splitTestData[i].split('-').map(part => part.toUpperCase());

        if (testData.length > 0 && testData.length < 4) {
            if (testData.length == 1) {
                for (let i = 0; i < geoData.length; i++) {
                    if (geoData[i].country == testData[0]) {
                        return true
                    }
                }
                return false
            } else if (testData.length == 2) {
                for (let i = 0; i < geoData.length; i++) {
                    if (geoData[i].country == testData[1]) {
                        for (let j = 0; j < geoData[i].states.length; j++) {
                            if (geoData[i].states[j].state == testData[0]) {
                                return true
                            }
                        }
                    }
                }
                return false
            } else if (testData.length == 3) {
                for (let i = 0; i < geoData.length; i++) {
                    if (geoData[i].country == testData[2]) {
                        for (let j = 0; j < geoData[i].states.length; j++) {
                            if (geoData[i].states[j].state == testData[1]) {
                                if (geoData[i].states[j].cities.includes(testData[0])) {
                                    console.log(geoData[i].states[j].state, testData, true)
                                    return true
                                }
                            }
                        }
                    }
                }
                return false
            }
        } else {
            return false
        }
    }
}

// Create a new distributor object based on the provided data.
// createNewDistributor function constructs a new distributor object with the distributorName, include regions, exclude regions and parent for sub distributor object.
function createNewDistributor(data, parent) {
    let distributorData = {
        distributorName: data.name.toUpperCase(),
        include: data.include.trim().toUpperCase().split(','),
        exclude: data.exclude.trim() != "" ? data.exclude.toUpperCase().split(',') : [],
        parent: parent
    };
    return distributorData
}

// Retrieve distributor information based on the distributorName.
// getDistributorData function searches for the distributor with the specified name in the distributorInformation array.
function getDistributorData(distributorName) {
    for (let i = 0; i < distributorInformation.length; i++) {
        if (distributorInformation[i].distributorName == distributorName.toUpperCase()) {
            return distributorInformation[i]
        }
    }
}

// Validate data for checking permissions.
// validateCheckPermissionData function checks if the provided region data for checking permissions of the distributor is valid.
function validateCheckPermissionData(data) {

    let errorMsg = []
    console.log("data in validateCheckPermissionData", data)
    if (data.distributorName.trim() == '') {
        errorMsg.push("Distributor Name must not be empty, please enter a valid distributor name")
    } else if (!validateDistributorName(data.distributorName.trim().toUpperCase())) {
        errorMsg.push("Distributor name does not exists")
    }
    let testData = data.testData.split(',')
    for (let i = 0; i < testData.length; i++) {
        if (!validateRegions(testData[i])) {
            errorMsg.push(testData[i].toUpperCase() + " does not exists in the csv file, please enter a valid region")
        }
    }
    console.log("errorMsg in validateCheckPermissionData", errorMsg)
    return errorMsg
}

/* Check permission for a distributor based on the provided testData.
 checkPermission function evaluates whether a distributor has access to specified regions based on the testData.*/
function checkPermission(distributorName, testData, origin) {
    console.log("istributorName, testData, origin :", distributorName, testData, origin)
    let validationResult = [], errorMsg = [];
    let distributorData = getDistributorData(distributorName)
    console.log("data :", testData)
    for (let i = 0; i < testData.length; i++) {
        let newTestData = testData[i].split('-');
        if (newTestData.length == 1) {
            if (distributorData.include.includes(testData[i])) {
                validationResult.push(distributorData.distributorName + " have access to " + testData[i])
            } else {
                validationResult.push(distributorData.distributorName + " do not have access to " + testData[i])
                errorMsg.push(distributorData.distributorName + " do not have access to " + testData[i])
            }
        }
        else if (newTestData.length == 2) {
            if (distributorData.include.includes(newTestData[1])) {
                if (distributorData.exclude.includes(testData[i])) {
                    validationResult.push(distributorData.distributorName + " do not have access to " + testData[i])
                    errorMsg.push(distributorData.distributorName + " do not have access to " + testData[i])
                } else {
                    validationResult.push(distributorData.distributorName + " have access to " + testData[i])
                }
            } else if (distributorData.include.includes(testData[i])) {
                validationResult.push(distributorData.distributorName + " have access to " + testData[i])

            } else {
                validationResult.push(distributorData.distributorName + " do not have access to " + testData[i])
                errorMsg.push(distributorData.distributorName + " do not have access to " + testData[i])
            }
        } else if (newTestData.length == 3) {
            if (distributorData.include.includes(newTestData[2])) {
                if (distributorData.include.includes(newTestData[1] + '-' + newTestData[2])) {
                    if (distributorData.include.includes(testData[i])) {
                        validationResult.push(distributorData.distributorName + " have access to " + testData[i])
                    } else {
                        if (distributorData.exclude.includes(testData[i])) {
                            validationResult.push(distributorData.distributorName + " do not have access to " + testData[i])
                            errorMsg.push(distributorData.distributorName + " do not have access to " + testData[i])
                        } else {
                            validationResult.push(distributorData.distributorName + " have access to " + testData[i])
                        }
                    }
                } else {
                    if (distributorData.exclude.includes(newTestData[1] + '-' + newTestData[2])) {
                        validationResult.push(distributorData.distributorName + " do not have access to " + testData[i])
                        errorMsg.push(distributorData.distributorName + " do not have access to " + testData[i])
                    } else {
                        if (distributorData.exclude.includes(testData[i])) {
                            validationResult.push(distributorData.distributorName + " do not have access to " + testData[i])
                            errorMsg.push(distributorData.distributorName + " do not have access to " + testData[i])
                        } else {
                            validationResult.push(distributorData.distributorName + " have access to " + testData[i])
                        }
                    }
                }
            }
            else {
                if (distributorData.include.includes(newTestData[1] + '-' + newTestData[2])) {
                    if (distributorData.exclude.includes(testData[i])) {
                        validationResult.push(distributorData.distributorName + " do not have access to " + testData[i])
                        errorMsg.push(distributorData.distributorName + " do not have access to " + testData[i])
                    } else {
                        validationResult.push(distributorData.distributorName + " have access to " + testData[i])
                    }
                } else if (distributorData.include.includes(testData[i])) {
                    validationResult.push(distributorData.distributorName + " have access to " + testData[i])
                } else {
                    validationResult.push(distributorData.distributorName + " do not have access to " + testData[i])
                    errorMsg.push(distributorData.distributorName + " do not have access to " + testData[i])
                }
            }
        }
    }
    return origin == "subDistributionCreation" ? errorMsg : validationResult;
}

// displayDistributorInformation function prints the distributor information to the console for informational purposes.
function displayDistributorInformation() {
    console.log("Distributor Information", distributorInformation)
}



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    main()
});
