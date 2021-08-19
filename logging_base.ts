/**
 * Data Logging Base Code
 */
namespace logging {

    let NONE = 0
    let USB = 1

    let delimiter = " "

    let incDate = false
    let incTime = false
    let incTemp = false
    let incPress = false
    let incHumid = false
    let incIAQ = false
    let incCO2 = false
    let incLight = false

    let tUnit = 0
    let pUnit = 0

    let logDate = ""
    let logTime = ""
    let logTemp = 0
    let logPress = 0
    let logHumid = 0
    let logIAQ = 0
    let logCO2 = 0
    let logLight = 0

    let dataEntry = ""
    let firstDataBlock = 24
    let entryNum = 0
    let writeTitles = false
    let dataFull = false

    let storedList: string[] = []
    let entryNumber = false
    let listLimit = 100
    let comms = NONE
    let entryBuild = ""
    let titleBuild = ""

    export enum ListNumber {
        //% block="Send"
        Send,
        //% block="Don't Send"
        DontSend
    }

    export enum Separator {
        //% block="Tab"
        tab,
        //% block="Semicolon"
        semicolon,
        //% block="Comma"
        comma,
        //% block="Space"
        space
    }

    // Set the output of logged data to the micro:bit USB (default baudrate is 115200).
    export function setDataForUSB() {
        comms = USB
        serial.redirectToUSB()
    }

    // Choice of which character to put between each data entry (the default is a space).
    export function selectSeparator(charSelect: Separator): void {
        if (charSelect == Separator.tab)
            delimiter = "\t"
        else if (charSelect == Separator.semicolon)
            delimiter = ";"
        else if (charSelect == Separator.comma)
            delimiter = ","
        else if (charSelect == Separator.space)
            delimiter = " "
    }

    // Include the date in the data logging output.
    export function includeDate() {
        incDate = true
    }

    // Include the time in the data logging output
    export function includeTime() {
        incTime = true
    }

    // Include the temperature in the data logging output.
    // tempUnit is in °C (Celsius) or °F (Fahrenheit) according to selection
    export function includeTemperature(tempUnit: TemperatureUnitList) {
        tUnit = tempUnit
        incTemp = true
    }

    // Include the presure in the data logging output.
    // presUnit is in Pa (Pascals) or mBar (millibar) according to selection
    export function includePressure(presUnit: PressureUnitList) {
        pUnit = presUnit
        incPress = true
    }

    // Include the humidity in the data logging output.
    export function includeHumidity() {
        incHumid = true
    }

    // Include the IAQ score in the data logging output.
    export function includeIAQ() {
        incIAQ = true
    }

    // Include the eCO2 in the data logging output.
    export function includeCO2() {
        incCO2 = true
    }

    // Include the light level in the data logging output (micro:bit LEDs cannot be used if this block is included).
    export function includeLight() {
        incLight = true
    }

    // Store the Kitronik Header and standard data column headings in the reserved metadata EEPROM blocks
    function storeTitles(): void {
        let kitronikHeader = "Kitronik Data Logger - Air Quality & Environmental Board - www.kitronik.co.uk\r\n"
        EEPROM.writeBlock(kitronikHeader, 21)

        let headings = ""

        if (incDate) {
            headings = headings + "Date" + delimiter
        }
        if (incTime) {
            headings = headings + "Time" + delimiter
        }
        if (incTemp) {
            headings = headings + "Temperature" + delimiter
        }
        if (incPress) {
            headings = headings + "Pressure" + delimiter
        }
        if (incHumid) {
            headings = headings + "Humidity" + delimiter
        }
        if (incIAQ) {
            headings = headings + "IAQ Score" + delimiter
        }
        if (incCO2) {
            headings = headings + "eCO2" + delimiter
        }
        if (incLight) {
            headings = headings + "Light" + delimiter
        }

        headings = headings + "\r\n"
        EEPROM.writeBlock(headings, 23)

        writeTitles = true
    }

    // Input information about the user and project in string format.
    // name of person carrying out data logging
    // subject area of the data logging project
    // year group of person carrying data logging (if school project)
    // group of person carrying data logging (if school project)
    export function addProjectInfo(name: string, subject?: string, year?: string, group?: string): void {
        if (comms == NONE) {
            setDataForUSB()
        }

        let projectInfo = "Name: " + name + "\r\n"
        if (subject != "") {
            projectInfo = projectInfo + "Subject: " + subject + "\r\n"
        }
        if (year != "") {
            projectInfo = projectInfo + "Year: " + year + "\r\n"
        }
        if (group != "") {
            projectInfo = projectInfo + "Class: " + group + "\r\n"
        }

        EEPROM.writeBlock(projectInfo, 22)
    }

    // Captures and logs the data requested with the "include" blocks.
    export function logData(): void {
        if (writeTitles == false) {
            storeTitles()
        }

        logDate = kitronik_air_quality.readDate()
        logTime = kitronik_air_quality.readTime()
        logTemp = BME688.readTemperature(tUnit)
        logPress = BME688.readPressure(pUnit)
        logHumid = BME688.humidityReading
        logIAQ = BME688.iaqScore
        logCO2 = BME688.eCO2Value
        logLight = input.lightLevel()

        if (incDate) {
            dataEntry = dataEntry + logDate + delimiter
        }
        if (incTime) {
            dataEntry = dataEntry + logTime + delimiter
        }
        if (incTemp) {
            dataEntry = dataEntry + logTemp + delimiter
        }
        if (incPress) {
            dataEntry = dataEntry + logPress + delimiter
        }
        if (incHumid) {
            dataEntry = dataEntry + logHumid + delimiter
        }
        if (incIAQ) {
            dataEntry = dataEntry + logIAQ + delimiter
        }
        if (incCO2) {
            dataEntry = dataEntry + logCO2 + delimiter
        }
        if (incLight) {
            dataEntry = dataEntry + logLight + delimiter
        }

        EEPROM.writeBlock(dataEntry + "\r\n", firstDataBlock + entryNum)

        let entryNum_H = entryNum >> 8
        let entryNum_L = entryNum & 0xFF

        EEPROM.writeByte(entryNum_H, (12 * 128))           // Store the current entry number at first bytes of block 12
        EEPROM.writeByte(entryNum_L, ((12 * 128) + 1))

        if (entryNum == 999) {
            dataFull = true
            entryNum = 0
        }
        else {
            entryNum++
        }
    }

    // Erases all data stored on the EEPROM by writing all bytes to 0xFF (does not erase reserved area).
    export function eraseData(): void {
        let progress = 0
        //show("Erasing Memory...", 2, ShowAlign.Centre)
        for (let addr = (firstDataBlock * 128); addr < 131072; addr++) {
            progress = Math.round((addr / 131072) * 100)
            EEPROM.writeByte(0xFF, addr)
        }
        //clear()
        //show("Memory Erase Complete", 2, ShowAlign.Centre)
        //basic.pause(2500)
        //clear()
    }

    // Send all the stored data via comms selected
    // Maximum of 1000 data entries stored
    export function sendAllData(): void {
        if (comms == NONE) {
            setDataForUSB()
        }

        let block = firstDataBlock
        let lastEntry = 0
        let header = ""
        let info = ""
        let titles = ""
        let data = ""

        header = EEPROM.readBlock(21)
        serial.writeString(header)      // Send Kitronik Header
        info = EEPROM.readBlock(22)
        serial.writeString(info)        // Send Project Info
        titles = EEPROM.readBlock(23)
        serial.writeString(titles)      // Send Data Column Headings

        if (dataFull) {
            for (block = firstDataBlock; block < 1024; block++) {
                data = EEPROM.readBlock(block)
                serial.writeString(data)
            }
        }
        else {
            lastEntry = (EEPROM.readByte(12 * 128) << 8) | (EEPROM.readByte((12 * 128) + 1))
            for (block = firstDataBlock; block < (firstDataBlock + lastEntry); block++) {
                data = EEPROM.readBlock(block)
                serial.writeString(data)
            }
        }
    }
}
