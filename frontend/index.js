import {initializeBlock, Button, Input, Label, Loader, useBase} from '@airtable/blocks/ui';
import React, { useState } from "react";

function ScrapIdealista() {
    const base = useBase();
    const [value, setValue] = useState("98444394");
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
        </div>;
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
    const table = base.getTableByName('Web links');
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
        alert(`new record created! ID: ${recordId}`);
    });
}

function getGallery(galleryJSON){
    return galleryJSON.map((url) => ({"url" : url}));   
}

async function getAmenities(base, amenitiesJSON){

    let amenitiesTable = base.getTable("Amenities");
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