import {initializeBlock, Box,Icon, Button, Input, Label, Loader, RecordCard, useBase, useRecords} from '@airtable/blocks/ui';
import React, { useState } from "react";

const tableName = 'Web links';
const tableNameAmenities = 'Amenities';

function ScrapIdealista() {
    const base = useBase();
    const table = base.getTableByName(tableName);
    const records = useRecords(table);
    

    const [value, setValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [scraperMsg, setScraperMsg] = useState("");
    const [scraperResult, setScraperResult] = useState("");

    return <div >
        <br/><br/>
        <Label 
            htmlFor="my-input"
            marginLeft="10px"
            >
                ID de Idealista: 
        </Label>
        <Input
            id = "my-input"
            value={value}
            onChange={
                e => {
                    setValue(e.target.value);
                    setScraperMsg("");
                    setScraperResult("");
                }
            }
            placeholder="id"
            width="100px"
            marginLeft="10px"
            marginRight="10px"
        />
        {(isLoading) ? 
            <Loader scale={0.4} /> : 
            <Button onClick={async () => 
                {
                    setIsLoading(true);
                    setScraperMsg("");
                    setScraperResult("");
                    const result = await scrapIdealistaUrl(value);
                    setIsLoading(false);
                    const resultMsg = getScraperMsg(result);
                    setScraperMsg(resultMsg);
                    const resultScraper = getScraperResultFromMsg(resultMsg);
                    setScraperResult(resultScraper);
                    if(resultScraper == "ok"){
                        addDatoToView(base, result.data, value);
                    }
                }} icon="public">
                     Scrap
                </Button>
        }
        <br/>
        {(scraperResult == "ko")? 
            <Label marginLeft="20px" textColor="red">{scraperMsg}</Label>:null
        }
        {(scraperResult == "ok")? 
            <Label marginLeft="20px" textColor="green">Scraper completed correctly</Label>:null
        }
        <br/>
        <br/>
        <ShowScrapedRecordsComponent records={records} table={table} />
        </div>;
}

function ShowScrapedRecordsComponent({records, table}) {
    let fields = [
        table.getField("Scraper Price"),
        // table.getField("Scraper FractionPrice"),
        table.getField("Scraper SQM"),
        table.getField("Scraper Bedrooms"),
        table.getField("Scraper Bathrooms"),
        table.getField("Scraper Gallery"),
        
    ];
    let scrapedRecordsFiltered = records ? filterScrperList(records) : null;
    let scrapedRecords = scrapedRecordsFiltered ? scrapedRecordsFiltered.map(record => {
        return (
           <Box key={record.id}>
                <RecordCard width={600} marginTop="7px" marginBottom="3px" record={record} fields={fields}/>
                <Label>&#8364; Estimated Fraction Price: {record.getCellValue("Scraper FractionPrice").toLocaleString('en-US', {style: 'currency',currency: 'EUR', maximumFractionDigits: 0})}</Label>
                {
                    (record.getCellValue("Scraper IsNewConstruction"))?
                        <Label marginLeft="15px">&#9961; New Construction</Label>
                        :null
                }
                
            </Box>
        );
    }): null;
    return (
        <Box marginLeft="20px">
            <Box>Number of incomplete records scraped: {scrapedRecords.length}</Box>
            {scrapedRecords}
            <Box marginTop="10px" marginBottom="20px">
                <Button onClick={async () => 
                {
                    dumpData(scrapedRecordsFiltered, table)
                }} icon="thumbsUp">
                     Sync Data
                </Button> 
            </Box>
        </Box>
    );
}

function filterScrperList(records){
    return records.filter(record => 
        {
         return (
                 (record.getCellValueAsString("Scraper Id") !== "") && 
                 ((record.getCellValueAsString("L_Hub") == "" ) ||
                  (record.getCellValueAsString("L_MicroMercados") == "" ) ||
                  (record.getCellValueAsString("L Municipio") == "" ) ||
                  (record.getCellValueAsString("L_Estado") == "" ) ||
                  (record.getCellValueAsString("L_Collection") == "" ) ||
                  (record.getCellValueAsString("L_Tipo") == "" )
                  )
                )
        })
}

function dumpData(scrapedRecordsFiltered, table){
    scrapedRecordsFiltered.forEach(record => {
        isValidRecord(record) ? setRecordValues(table, record) : console.log("invalid record: " + record.id)
    });
}

function isValidRecord(record){

    if(
        !record.getCellValue("Scraper Id") || 
        !record.getCellValue("Scraper Price") ||
        !record.getCellValue("Scraper Description") ||
        !record.getCellValue("Scraper Location") ||
        !record.getCellValue("Scraper SQM") ||
        !record.getCellValue("Scraper Bedrooms") ||
        !record.getCellValue("Scraper Bathrooms") ||
        !record.getCellValue("Scraper Gallery") ||
        !record.getCellValue("Scraper FractionPrice")
    ){
        return false;
    }
    
    return true;
}

function setRecordValues(table, record){
    const dorms = parseInt(record.getCellValue("Scraper Bedrooms"));
    const baths = parseInt(record.getCellValue("Scraper Bathrooms"));
    const area = parseInt(record.getCellValue("Scraper SQM"));
    const adress = record.getCellValue("Scraper Location");
    const price = parseInt(record.getCellValue("Scraper Price").replace(/\./g,'').replace(/€/g,''));
    console.log("Price: " + price);

    table.updateRecordAsync(record,
        {
            'Dorms': dorms,
            'Baths': baths,
            'Area': area,
            'T_PVP': price,
            'Adress': adress,
            'Creator': {name: 'Scraper'},
        }
    );
}

async function scrapIdealistaUrl(idealistaid){
    let response = await fetch('https://us-central1-vivla-web.cloudfunctions.net/scrape?idealistaid='+idealistaid);
    const responseJSON = await response.json();
    return responseJSON;
}

function getScraperMsg(result){
    if(result.data.error != undefined) return "Error: " + result.data.error.msg;
    if(result.error.mgs != undefined) return "Error: " + result.error.msg;
    return "Scraper completed correctly"
}

function getScraperResultFromMsg(msg){
    if(msg.includes("Error")){
        return "ko";
    }
    return "ok";
}

async function addDatoToView(base, data, idIdealista){
    const table = base.getTableByName(tableName);
    const amenities = await getAmenities(base, data.amenities);
    console.log(data);

    table.createRecordAsync({
        'Name': 'Idealista_' + idIdealista,
        'Scraper Id': idIdealista,
        'Scraper MainImg': data.mainImg,
        'Scraper Price': data.price,
        'Scraper Description': data.description,
        'Scraper Location': data.location,
        'Scraper SQM': data.sqm,
        'Scraper Bedrooms': data.bedrooms,
        'Scraper Bathrooms': data.bathrooms,
        "Scraper Gallery": getGallery(data.gallery),
        "Scraper VideoUrl": data.video,
        "Scraper VirtualTourUrl": data.virtualTour,
        "Scraper IsNewConstruction": (data.priceInfo.isNewConstruction) ? true : false,
        "Scraper TaxRegion": data.priceInfo.regionTaxex.region,
        "Scraper NeedsFurniture": true,
        "Scraper FractionPrice": data.priceInfo.totalOwnership,
        "Scraper Amenities": amenities,
        "Scraper Features": getFeatures(data.features)

    }).then(function (recordId) {
        // alert(`new record created! ID: ${recordId}`);
        console.log(`new record created! ID: ${recordId}`);
    });
}

function getGallery(galleryJSON){
    return galleryJSON.map((url) => ({"url" : url}));   
}

async function getAmenities(base, amenitiesJSON){

    let amenitiesTable = base.getTable(tableNameAmenities);
    let amenitiesQuery = await amenitiesTable.selectRecordsAsync();
    let amenitiesDict = {};
    for (let record of amenitiesQuery.records) {
        amenitiesDict[record.name] = {id: record.id};
    }   

    const amenitiesList = amenitiesJSON.map((amenitie) => mapAmenitie(amenitiesDict, amenitie));  
    return amenitiesList.filter((amenitie) => amenitie.id != undefined); 
}

function mapAmenitie(records, amenitie){
    if(records[amenitie] != undefined){
        return records[amenitie];
    }
    return "";
}

function getFeatures(featuresJSON){
    return String(featuresJSON);  
}


initializeBlock(() => <ScrapIdealista />)