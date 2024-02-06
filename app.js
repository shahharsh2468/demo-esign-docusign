require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const docusign = require("docusign-esign");
const fs = require("fs-extra");
const session = require("express-session");
const validator = require("validator");
const alert = require("alert");
const moment = require("moment");
const isuri = require("isuri");
const pdf2base64 = require("pdf-to-base64");
const dsReturnUrl = process.env.REDIRECT_URL + 'ds-return';
const dsPingUrl = process.env.REDIRECT_URL; // Url that will be pinged by the DocuSign signing via Ajax

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: "dfjhjashkj342",
    resave: true,
    saveUninitialized: true
}));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname);

async function checkToken(req){
    if(req.session.access_token && (Date.now() < req.session.expires_at)){
        console.log("re-using access token");
    } else {
        console.log("generating new access token");
        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(process.env.BASE_PATH);
        const results = await dsApiClient.requestJWTUserToken(process.env.INTEGRATION_KEY, process.env.USER_ID, "signature", process.env.PRIVATE_KEY, 3600); //3600 is expiresin whereas "signature is oauth scope"
        req.session.access_token = results.body.access_token;
        req.session.expires_at = Date.now() + (results.body.expires_in - 60) * 1000;
    }
}

// async function getEnvelopesApi(req){
//     let dsApiClient = new docusign.ApiClient();
//     dsApiClient.setBasePath(process.env.BASE_PATH);
//     dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.session.access_token);
//     let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
//     return envelopesApi;
// }

function getHTMLDocument(docFile, args){
    console.log(docFile);
    let docHTMLContent = fs.readFileSync(docFile, { encoding: "utf8" });
    // let docHTMLContent = args.docFile;

    // Substitute values into the HTML
    // Substitute for: {signerName}, {signerEmail}, {ccName}, {ccEmail}
    
    // return docHTMLContent
    // .replace("{signerName}", args.signerName)
    // .replace("{signerEmail}", args.signerEmail)
    // .replace("{ccName}", args.ccName)
    // .replace("{ccEmail}", args.ccEmail)
    // .replace("/sn1/", "<ds-signature data-ds-role=\"Signer\"/>")
    // .replace("/l1q/", "<input data-ds-type=\"number\" name=\"l1q\"/>")
    // .replace("/l2q/", "<input data-ds-type=\"number\" name=\"l2q\"/>");
    
    return docHTMLContent
    .replace("{signerName1}", args.signerName1)
    .replace("{signerEmail1}", args.signerEmail1)
    .replace("{signerName2}", args.signerName2)
    .replace("{signerEmail2}", args.signerEmail2)
    .replace("{signerName3}", args.signerName3)
    .replace("{signerEmail3}", args.signerEmail3)
    .replace("/l1q/", "<input data-ds-type=\"number\" name=\"l1q\"/>")
    .replace("/l2q/", "<input data-ds-type=\"number\" name=\"l2q\"/>")
    .replace("{ccName}", args.ccName)
    .replace("{ccEmail}", args.ccEmail)
    .replace("/sn1/", "<ds-signature data-ds-role=\"Signer1\"/>")
    .replace("/sn2/", "<ds-signature data-ds-role=\"Signer2\"/>")
    .replace("/sn3/", "<ds-signature data-ds-role=\"Signer3\"/>");
}

function downloadDocument(req){
    const envelopeId = 'b6367d1d-74b2-475a-84ef-f452cbcbce94';
    const document_id = '2';
    const args = {
        accessToken: req.session.access_token,
        basePath: process.env.BASE_PATH,
        accountId: process.env.ACCOUNT_ID
    };

    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(args.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient), results = null;
    results = envelopesApi.getDocument(args.accountId, envelopeId, document_id, {});
    console.log(results);
    // const fs = require('fs');
    let file = fs.writeFileSync('document.pdf', results);
    console.log(file);
    // results = envelopesApi.getDocument(args.accountId, envelopeId, document_id)
    //     .then((response) => {
    //       const documentData = response.body;
      
    //       // Save the document data to a file or process it as needed
    //       // For example, save it to a file named "document.pdf"
    //       const fs = require('fs');
    //       const file = fs.writeFileSync('document.pdf', Buffer.from(documentData, 'base64'));
    //   console.log(file);
    //       console.log('Document downloaded successfully');
    //       return file;
    //     })
    // console.log(base64);
    // console.lo(base64);
    return file;
}

function makeEnvelopeWithExisting(args, req){
    
    let dateSignedTab1 = docusign.DateSigned.constructFromObject({
        anchorString: "/signer1date/",
        font: "helvetica",
        fontSize: "size12",
        fontColor: "black",
        anchorYOffset: "-8",
        anchorUnits: "pixels",
        anchorXOffset: "105",
        tabLabel: "signer3date",
    });
  
    let signer1 = docusign.Signer.constructFromObject({
        email: args.signerEmail1,
        name: args.signerName1,
        clientUserId: args.signerClientId,
        recipientId: "1",
        // routingOrder: "1",
        roleName: "Signer1",
        tabs: docusign.Tabs.constructFromObject({
            dateSignedTabs: [dateSignedTab1],    
            // textTabs: [TextTab],
        }),
    });

    let dateSignedTab2 = docusign.DateSigned.constructFromObject({
        anchorString: "/signer2date/",
        font: "helvetica",
        fontSize: "size12",
        fontColor: "black",
        anchorYOffset: "-8",
        anchorUnits: "pixels",
        anchorXOffset: "105",
        tabLabel: "signer3date",
    });

    let signer2 = docusign.Signer.constructFromObject({
        email: args.signerEmail2,
        name: args.signerName2,
        clientUserId: args.signerClientId,
        recipientId: "2",
        // routingOrder: "2",
        roleName: "Signer2",
        tabs: docusign.Tabs.constructFromObject({
            dateSignedTabs: [dateSignedTab2],
        }),
    });

    let dateSignedTab3 = docusign.DateSigned.constructFromObject({
        anchorString: "/signer3date/",
        font: "helvetica",
        fontSize: "size12",
        fontColor: "black",
        anchorYOffset: "-8",
        anchorUnits: "pixels",
        anchorXOffset: "105",
        tabLabel: "signer3date",
    });

    let signer3 = docusign.Signer.constructFromObject({
        email: args.signerEmail3,
        name: args.signerName3,
        clientUserId: args.signerClientId,
        recipientId: "3",
        // routingOrder: "3",
        roleName: "Signer3",
        tabs: docusign.Tabs.constructFromObject({
            dateSignedTabs: [dateSignedTab3],
        }),
    });

    let cc = new docusign.CarbonCopy.constructFromObject({
        email: args.ccEmail,
        name: args.ccName,
        recipientId: "4",
        // routingOrder: "4",
    });
    
    
    // Add the recipients to the envelope object
    let recipients = docusign.Recipients.constructFromObject({
        signers: [signer1, signer2, signer3],
        carbonCopies: [cc],
    });

    // // add the document
    let htmlDefinition = new docusign.DocumentHtmlDefinition();
    htmlDefinition.source = getHTMLDocument(args.docFile1, args);

    let document = new docusign.Document();
    document.name = "FirstDemoForRentSynegy.html"; // can be different from actual file name
    document.documentId = "c671747c-3245-1234-5678-4a4a48e23744"; // a label used to reference the doc
    document.htmlDefinition = htmlDefinition;

    // add the document
    // let htmlDefinition2 = new docusign.DocumentHtmlDefinition();
    // htmlDefinition2.source = 'document';
    
    // console.log(path.resolve(__dirname,"htmlCode.pdf"));
    // let document2 = new docusign.Document();
    // document2.name = downloadDocument(req); // can be different from actual file name
    // document2.documentId = "2"; // a label used to reference the doc
    // // document2.fileExtension = "pdf"; // a label used to reference the doc
    // document2.documentBase64 = file; // a label used to reference the doc
    // document2.htmlDefinition = htmlDefinition2;

    // let document2 = new docusign.Document();
    // document2.name = "SecondDoc.html"; // can be different from actual file name
    // document2.documentId = "2"; // a label used to reference the doc
    // document2.htmlDefinition = downloadDocument(req);

    let filepath = fs.readFileSync(path.resolve(__dirname,'SecondDoc.html.pdf'));

    let document2 = new docusign.Document(),
        doc2b64 = Buffer.from(filepath).toString("base64");
    document2.documentBase64 = doc2b64;
    document2.name = "SecondDoc"; // can be different from actual file name
    document2.fileExtension = "pdf";
    document2.documentId = "93be49ab-3425-3421-6734-f752070d71ec";

    // console.log(pdf2base64('secondDoc.html.pdf'));
    // let document2 =
    // {
    //     "documentId":"2",
    //     "name":"SigningForm",
    //    "htmlDefinition":{
    //     "source":"document"
    //     },
    //     "documentBase64": path.resolve(__dirname,'SecondDoc.html.pdf')
    // };
    // create the envelope definition
    let env = new docusign.EnvelopeDefinition();
    env.emailSubject = "Testing For Html Signing Document - Rent Synegy";
    env.documents = [document,document2];
    env.recipients = recipients;
    env.status = args.status;
    
    return env;
}

function makeEnvelope(args){
    let dateSignedTab1 = docusign.DateSigned.constructFromObject({
        anchorString: "/signer1date/",
        font: "helvetica",
        fontSize: "size12",
        fontColor: "black",
        anchorYOffset: "-8",
        anchorUnits: "pixels",
        anchorXOffset: "105",
        tabLabel: "signer3date",
    });
  
    let signer1 = docusign.Signer.constructFromObject({
        email: args.signerEmail1,
        name: args.signerName1,
        clientUserId: args.signerClientId,
        recipientId: "1",
        // routingOrder: "1",
        roleName: "Signer1",
        tabs: docusign.Tabs.constructFromObject({
            dateSignedTabs: [dateSignedTab1],    
            // textTabs: [TextTab],
        }),
    });

    let dateSignedTab2 = docusign.DateSigned.constructFromObject({
        anchorString: "/signer2date/",
        font: "helvetica",
        fontSize: "size12",
        fontColor: "black",
        anchorYOffset: "-8",
        anchorUnits: "pixels",
        anchorXOffset: "105",
        tabLabel: "signer3date",
    });

    let signer2 = docusign.Signer.constructFromObject({
        email: args.signerEmail2,
        name: args.signerName2,
        clientUserId: args.signerClientId,
        recipientId: "2",
        // routingOrder: "2",
        roleName: "Signer2",
        tabs: docusign.Tabs.constructFromObject({
            dateSignedTabs: [dateSignedTab2],
        }),
    });

    let dateSignedTab3 = docusign.DateSigned.constructFromObject({
        anchorString: "/signer3date/",
        font: "helvetica",
        fontSize: "size12",
        fontColor: "black",
        anchorYOffset: "-8",
        anchorUnits: "pixels",
        anchorXOffset: "105",
        tabLabel: "signer3date",
    });

    let signer3 = docusign.Signer.constructFromObject({
        email: args.signerEmail3,
        name: args.signerName3,
        clientUserId: args.signerClientId,
        recipientId: "3",
        // routingOrder: "3",
        roleName: "Signer3",
        tabs: docusign.Tabs.constructFromObject({
            dateSignedTabs: [dateSignedTab3],
        }),
    });

    let cc = new docusign.CarbonCopy.constructFromObject({
        email: args.ccEmail,
        name: args.ccName,
        recipientId: "4",
        // routingOrder: "4",
    });

    // // add formula tabs
    // const price1 = 5;
    // const formulaTab1 = docusign.FormulaTab.constructFromObject({
    //     font: "helvetica",
    //     fontSize: "size11",
    //     fontColor: "black",
    //     anchorString: "/l1e/",
    //     anchorYOffset: "-8",
    //     anchorUnits: "pixels",
    //     anchorXOffset: "105",
    //     tabLabel: "l1e",
    //     formula: `[l1q] * ${price1}`,
    //     roundDecimalPlaces: "0",
    //     required: "true",
    //     locked: "true",
    //     disableAutoSize: "false",
    // });

    // const price2 = 150;
    // const formulaTab2 = docusign.FormulaTab.constructFromObject({
    //     font: "helvetica",
    //     fontSize: "size11",
    //     fontColor: "black",
    //     anchorString: "/l2e/",
    //     anchorYOffset: "-8",
    //     anchorUnits: "pixels",
    //     anchorXOffset: "105",
    //     tabLabel: "l2e",
    //     formula: `[l2q] * ${price2}`,
    //     roundDecimalPlaces: "0",
    //     required: "true",
    //     locked: "true",
    //     disableAutoSize: "false",
    // });

    // const formulaTab3 = docusign.FormulaTab.constructFromObject({
    //     font: "helvetica",
    //     fontSize: "size11",
    //     fontColor: "black",
    //     anchorString: "/l3t/",
    //     anchorYOffset: "-8",
    //     anchorUnits: "pixels",
    //     anchorXOffset: "105",
    //     tabLabel: "l3t",
    //     formula: `[l1e] + [l2e]`,
    //     roundDecimalPlaces: "0",
    //     required: "true",
    //     locked: "true",
    //     disableAutoSize: "false",
    //     bold: "true",
    // });

    // const signerTabs = docusign.Tabs.constructFromObject({
    //     formulaTabs: [formulaTab1, formulaTab2, formulaTab3]
    // });
    // signer.tabs = signerTabs;
    
    // Add the recipients to the envelope object
    let recipients = docusign.Recipients.constructFromObject({
        signers: [signer1, signer2, signer3],
        carbonCopies: [cc],
    });

    // add the document
    let htmlDefinition = new docusign.DocumentHtmlDefinition();
    htmlDefinition.source = getHTMLDocument(args.docFile1, args);

    let document = new docusign.Document();
    document.name = "FirstDemoForRentSynegy"; // can be different from actual file name
    document.documentId = "1"; // a label used to reference the doc
    document.htmlDefinition = htmlDefinition;

    // add the document
    let htmlDefinition2 = new docusign.DocumentHtmlDefinition();
    htmlDefinition2.source = getHTMLDocument(args.docFile2, args);

    let document2 = new docusign.Document();
    document2.name = "SecondDoc"; // can be different from actual file name
    document2.documentId = "2"; // a label used to reference the doc
    document2.htmlDefinition = htmlDefinition2;

    // create the envelope definition
    let env = new docusign.EnvelopeDefinition();
    env.emailSubject = "Testing For Html Signing Document - Rent Synegy";
    env.documents = [document, document2];
    env.recipients = recipients;
    env.status = args.status;
    
    return env;
}

function makeRecipientViewRequest(args){
    let viewRequest = new docusign.RecipientViewRequest();

    // Set the url where you want the recipient to go once they are done signing
    // should typically be a callback route somewhere in your app.
    // The query parameter is included as an example of how
    // to save/recover state information during the redirect to
    // the DocuSign signing. It's usually better to use
    // the session mechanism of your web framework. Query parameters
    // can be changed/spoofed very easily.   
    viewRequest.returnUrl = args.dsReturnUrl + "?state=123"; //here i have to change localhost:4000 or rentsynergy redirect path later.

    // How has your app authenticated the user? In addition to your app's
    // authentication, you can include authenticate steps from DocuSign.
    // Eg, SMS authentication
    viewRequest.authenticationMethod = "none"; // right now we're writing none for authentication "for rentsynergy"

    // Recipient information must match embedded recipient info
    // we used to create the envelope.
    viewRequest.email = args.signerEmail;
    viewRequest.userName = args.signerName;
    viewRequest.clientUserId = args.signerClientId;

    // DocuSign recommends that you redirect to DocuSign for the
    // embedded signing. There are multiple ways to save state.
    // To maintain your application's session, use the pingUrl
    // parameter. It causes the DocuSign signing web page
    // (not the DocuSign server) to send pings via AJAX to your
    // app,
    viewRequest.pingFrequency = 600; // seconds
    // NOTE: The pings will only be sent if the pingUrl is an https address // hence this will not work in my localhost
    viewRequest.pingUrl = args.dsPingUrl; // optional setting

    return viewRequest;
}

// async function sendEnvelope(args){
//     let dsApiClient = new docusign.ApiClient();
//     dsApiClient.setBasePath(args.basePath);
//     dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
//     let envelopesApi = new docusign.EnvelopesApi(dsApiClient);

//     let envelopeId;
//     // if(!req.session.envelopeId){
//     //     // Step 1. Make the envelope body
//     //     let envelope = makeEnvelope(args.envelopeArgs);

//     //     // Step 2. Send the envelope
//     //     let results = await envelopesApi.createEnvelope(args.accountId, {
//     //         envelopeDefinition: envelope,
//     //     });
//     //     envelopeId = results.envelopeId;
//     //     req.session.envelopeId = envelopeId;
//     // } else {
//     //     envelopeId = req.session.envelopeId;
//     // }
//     envelopeId = "2c9bc3b1-ec7c-4dba-8ba5-87bb07656a05";
//     console.log(envelopeId);

//     // Step 3. Create the recipient view
//     let viewRequest = makeRecipientViewRequest(args.envelopeArgs);
//     console.log(viewRequest);
//     // Call the CreateRecipientView API
//     // Exceptions will be caught by the calling function
//     // console.log(args.accountId);
//     results = await envelopesApi.createRecipientView(args.accountId, envelopeId, {
//         recipientViewRequest: viewRequest,
//     });
//     // console.log("here");
//     console.log(results);
//     //ds-snippet-end:eSign38Step3

//     // console.log(envelopeId + "after_result");

//     return { envelopeId: envelopeId, redirectUrl: results.url };
// }

app.get("/", async(req,res) => {    
    await checkToken(req);
    res.sendFile(path.join(__dirname,"main.html"));
});

app.get("/sent_envelope", async(req,res) => {
    console.log("Send Envelope");
    res.redirect(process.env.REDIRECT_URL);
});

function makeSenderViewRequest(){
    let viewRequest = new docusign.ReturnUrlRequest();
    // Data for this method
    // args.dsReturnUrl
  
    // Set the url where you want the recipient to go once they are done signing
    // should typically be a callback route somewhere in your app.
    viewRequest.returnUrl = process.env.REDIRECT_URL + 'sent_envelope';
    // Set showTabPalette to false to hide the tab palette

    return viewRequest;
}

app.get("/sender_request", async(req,res) => {
    let jsonData;
    if(req.query.data){
        const jsonDataString = decodeURIComponent(req.query.data || '');
        jsonData = JSON.parse(jsonDataString);
    } else {
        jsonData = {
            subject: 'Existing Envelope',
            envelopeId: ''
        };

        if(req.session.envelopeId){
            jsonData.envelopeId = req.session.envelopeId;
        }
    }
    // console.log(jsonData); return false;
    res.render(path.join(__dirname,"sender_request.html"), { jsonData });
});

app.post("/sender_request", async(req,res) => {
    await checkToken(req);
    try{
        const envelopeId = req.body.envelopeId;

        const args = {
            accessToken: req.session.access_token,
            basePath: process.env.BASE_PATH,
            accountId: process.env.ACCOUNT_ID
        }

        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(args.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
        let envelopesApi = new docusign.EnvelopesApi(dsApiClient);

        let viewRequest = makeSenderViewRequest();
        
        results = await envelopesApi.createSenderView(args.accountId, envelopeId, {
            returnUrlRequest: viewRequest,
        });

        if (results) {
            let url = results.url;
            if (req.body.startingView === "recipient") {
                console.log("here");
                url = await url.replace("send=1", "send=0");
            }

            url = await url+"&showTabPalette="+req.body.showTabPalette;
            console.log(url);
            res.redirect(url);
        }
    } catch (error) {
        const errorBody = error && error.response && error.response.body;
        // we can pull the DocuSign error code and message from the response body
        const errorCode = errorBody && errorBody.errorCode;
        const errorMessage = errorBody && errorBody.message;

        const response = {
            errorMessage: errorMessage,
            errorCode: errorCode,
            errorBody: error
        }
        res.send(response);
    }
});

app.get("/view_request", async(req,res) => {
    let jsonData;
    if(req.query.data){
        const jsonDataString = decodeURIComponent(req.query.data || '');
        jsonData = JSON.parse(jsonDataString);
    } else {
        jsonData = {
            signerName: '',
            signerEmail: '',
            envelopeId: ''
        };

        if(req.session.envelopeId){
            jsonData.envelopeId = req.session.envelopeId;
        }
    }
    // console.log(jsonData); return false;
    res.render(path.join(__dirname,"view_request.html"), { jsonData });
})

app.post("/view_request", async(req,res) => {
    await checkToken(req);
    console.log(req.session.envelopeId);
    let envelopeId = await req.session.envelopeId;
    if(req.body.envelopeId){
        envelopeId = await req.body.envelopeId;
    }

    const envelopeArgs = {
        signerEmail: req.body.signerEmail,
        signerName: req.body.signerName,
        envelopeId: envelopeId,
        signerClientId: process.env.CLIENT_ID,
        dsReturnUrl: dsReturnUrl,
        dsPingUrl: dsPingUrl
    };
    const args = {
        accessToken: req.session.access_token,
        basePath: process.env.BASE_PATH,
        accountId: process.env.ACCOUNT_ID,
        envelopeArgs: envelopeArgs
    }
    let results = null;
    try{
        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(args.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
        let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
        
        // Step 3. Create the recipient view
        let viewRequest = makeRecipientViewRequest(args.envelopeArgs);
        console.log(viewRequest);
        // Call the CreateRecipientView API
        // Exceptions will be caught by the calling function
        results = await envelopesApi.createRecipientView(args.accountId, args.envelopeArgs.envelopeId, {
            recipientViewRequest: viewRequest,
        });
        // console.log("here");
        console.log(results);

        if(results && results.url){
            return res.redirect(results.url);
        }
    } catch(error) {
        const errorBody = error && error.response && error.response.body;
        // we can pull the DocuSign error code and message from the response body
        const errorCode = errorBody && errorBody.errorCode;
        const errorMessage = errorBody && errorBody.message;

        const response = {
            errorMessage: errorMessage,
            errorCode: errorCode,
            errorBody: error
        }
        res.send(response);
    }

    if(results){
        console.log("here");
        res.redirect(process.env.REDIRECT_URL);
    } else {
        console.log("Successfully run!");
    }
});

app.post("/form", async(req,res) => {
    // console.log(req.body);return false;
    // console.log(path.resolve(__dirname,"htmlCode.pdf")); return false;
    await checkToken(req);
    const envelopeArgs = {
        signerEmail1: req.body.signerEmail1,
        signerName1: req.body.signerName1,
        signerEmail2: req.body.signerEmail2,
        signerName2: req.body.signerName2,
        signerEmail3: req.body.signerEmail3,
        signerName3: req.body.signerName3,
        ccEmail: req.body.ccEmail,
        ccName: req.body.ccName,
        status: req.body.status,
        signerClientId: process.env.CLIENT_ID,
        // signer2ClientId: 2000,
        // signer3ClientId: 3000,
        // docFile: path.resolve(__dirname,"htmlCode.pdf"),
        docFile1: path.resolve(__dirname,"demo_contract.html"),
        docFile2: path.resolve(__dirname,"order_form.html"),
        // docFile: html_content,
        dsReturnUrl: dsReturnUrl,
        dsPingUrl: dsPingUrl
    };
    console.log();
    const args = {
        accessToken: req.session.access_token,
        basePath: process.env.BASE_PATH,
        accountId: process.env.ACCOUNT_ID,
        envelopeArgs: envelopeArgs
    }
    let results = null;
    try{
        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(args.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
        let envelopesApi = new docusign.EnvelopesApi(dsApiClient);

        // Step 1. Make the envelope body
        let envelope = makeEnvelope(args.envelopeArgs);
        // let envelope = makeEnvelopeWithExisting(args.envelopeArgs, req);

        // Step 2. Send the envelope
        let results = await envelopesApi.createEnvelope(args.accountId, {
            envelopeDefinition: envelope,
        });
        let envelopeId = results.envelopeId;
        req.session.envelopeId = envelopeId;
        console.log(req.session.envelopeId);
        // results = await sendEnvelope(args);
        // if(results && results.redirectUrl){
        //     return res.redirect(results.redirectUrl);
        // }
        if(req.body.status == "created"){
            res.redirect(process.env.REDIRECT_URL+'sender_request');
        } else {            
            res.redirect(process.env.REDIRECT_URL+'view_request');
        }
    } catch(error) {
        const errorBody = error && error.response && error.response.body;
        // we can pull the DocuSign error code and message from the response body
        const errorCode = errorBody && errorBody.errorCode;
        const errorMessage = errorBody && errorBody.message;

        const response = {
            errorMessage: errorMessage,
            errorCode: errorCode,
            errorBody: error
        }
        res.send(response);
    }

    if(results){
        console.log("here");
        res.redirect(process.env.REDIRECT_URL);
    } else {
        console.log("Successfully run!");
    }
});

app.get("/ds-return", async(req,res) => {
    // alert("successfully signed");
    res.sendFile(path.join(__dirname,"signing_success.html"));
});

function fetchEnvelopes(req, status){    
    const args = {
        accessToken: req.session.access_token,
        basePath: process.env.BASE_PATH,
        accountId: process.env.ACCOUNT_ID
    };

    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(args.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient), results = null;
    let options = {
        fromDate: moment().subtract(30, 'days').format(),
    };
    
    if(status){
        options.status = status;
    }

    results = envelopesApi.listStatusChanges(args.accountId, options);

    return results;
}

app.get("/delete_envelope/:id", async(req,res) => {
    try{
        await checkToken(req);
        const envelopeId = req.params.id;
        const args = {
            accessToken: req.session.access_token,
            basePath: process.env.BASE_PATH,
            accountId: process.env.ACCOUNT_ID
        };

        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(args.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
        let foldersApi = new docusign.FoldersApi(dsApiClient), results = null;
        let folderRequest = new docusign.FoldersRequest();
        folderRequest.EnvelopeIds = [envelopeId];
        results = await foldersApi.moveEnvelopes(args.accountId, 'recyclebin', {'foldersRequest' : folderRequest});
        console.log(results);
        // Move the deleted envelope back to the Inbox folder
        let foldersResponse = await foldersApi.list(args.accountId);
        console.log(foldersResponse);
        // Search for the folders you are interested in
        foldersResponse.folders.forEach(folder => 
        {
            if (folder.name == 'Inbox')
            {
                inboxFolderId = folder.folderId;
            }
            else if (folder.name == 'Deleted Items')
            {
                recycleBinFolderId = folder.folderId;
            }
        });
        folderRequest.fromFolderId = recycleBinFolderId;
        folderRequest.EnvelopeIds = [envelopeId];
        console.log(folderRequest);
        results = await foldersApi.moveEnvelopes(args.accountId, inboxFolderId, {'foldersRequest' : folderRequest});
        console.log(results);

        if(results){
            console.log("Envelope Deleted successfully!");
            res.redirect(process.env.REDIRECT_URL+'envelopes');
        }  
    } catch(error) {
        const errorBody = error && error.response && error.response.body;
        // we can pull the DocuSign error code and message from the response body
        const errorCode = errorBody && errorBody.errorCode;
        const errorMessage = errorBody && errorBody.message;

        const response = {
            errorMessage: errorMessage,
            errorCode: errorCode,
            errorBody: error
        }
        res.send(response);
    }
});

app.get("/void_envelope/:id", async(req,res) => {
    try{        
        await checkToken(req);
        const envelopeId = req.params.id;
        const args = {
            accessToken: req.session.access_token,
            basePath: process.env.BASE_PATH,
            accountId: process.env.ACCOUNT_ID
        };
    
        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(args.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
        let envelopesApi = new docusign.EnvelopesApi(dsApiClient), results = null;
        let env = new docusign.Envelope();
        env.status = 'voided';
        env.voidedReason = 'changed my mind';
        results = await envelopesApi.update(args.accountId, envelopeId, {'envelope' : env});

        if(results){
            console.log("voided successfully!");
            res.redirect(process.env.REDIRECT_URL+'envelopes');
        }        
    } catch(error) {
        const errorBody = error && error.response && error.response.body;
        // we can pull the DocuSign error code and message from the response body
        const errorCode = errorBody && errorBody.errorCode;
        const errorMessage = errorBody && errorBody.message;

        const response = {
            errorMessage: errorMessage,
            errorCode: errorCode,
            errorBody: error
        }
        res.send(response);
    }
});

app.get("/envelopes", async(req,res) => {
    try{
        await checkToken(req);
        let status = null;
        if(req.query.status){
            status = req.query.status;
        }
        let envelopes = await fetchEnvelopes(req, status);
        // return res.send(envelopes);
        let total_set_size = envelopes.totalSetSize;
        envelopes = envelopes.envelopes;

        let html = '<html><head><title>List of Envelopes</title></head><body>';
        html += `<div>
                    <a href="/envelopes?status=created">created</a>        
                    <a href="/envelopes?status=delivered">delivered</a>        
                    <a href="/envelopes?status=completed">completed</a>        
                    <a href="/envelopes?status=voided">voided</a>        
                    <a href="/envelopes?status=deleted">deleted</a>        
                    <a href="/envelopes">All</a>        
                </div>`;
        html += '<u><h1 style="display: flex;justify-content: space-around;">List of Envelopes</h1></u>';
        html += '<h3 style="display: flex;justify-content: space-around;">(Total Envelopes: '+total_set_size+')</h3>';

        if (envelopes && envelopes.length > 0) {
            html += '<div style="display: flex; flex-direction: row; flex-wrap: wrap; justify-content:space-between; ">';
            envelopes.forEach(envelope => {

                let json_data = {
                    envelopeId: envelope.envelopeId,
                    subject: envelope.emailSubject
                };
                json_data = encodeURIComponent(JSON.stringify(json_data));

                let date = new Date(envelope.createdDateTime);

                html += `<div style="border: 1px solid black; margin-bottom: 20px; width:30%; padding:5px;">`;
                html += `<div><strong>Subject:</strong> ${envelope.emailSubject},</div>
                <div><strong>Envelope ID:</strong> ${envelope.envelopeId}, </div>
                <div><strong>Sender:</strong> ${envelope.sender.userName} (${envelope.sender.email}),</div>
                <div><strong>Recipients:</strong> <a href="${envelope.recipientsUri}">Click Here</a>,</div>
                <div><strong>Status:</strong> ${envelope.status}</div>
                <div><strong>Created Date:</strong> ${date}</div>
                <div><strong>List of Documents: </strong> <a href="${envelope.documentsUri}">Click Here</a>,</div>`;  
                html += '<div><strong>Envelope Details: </strong><a href="/envelopes/'+envelope.envelopeId+'">Click Here</a></div>'; 
                html += '<div><strong>Delete Envelope: </strong><a href="/delete_envelope/'+envelope.envelopeId+'">Click Here</a></div>';
                if(envelope.status != "voided" && envelope.status != "completed"){    
                    html += '<div><strong>Void Envelope: </strong><a href="/void_envelope/'+envelope.envelopeId+'">Click Here</a></div>';
                }
                if(envelope.status == "created"){
                    html += `<div><strong>Send Envelope to recipients: </strong><a href="/sender_request?data=${json_data}">Send Envelope</a></div>`;
                }
                html += `</div>`;
            });
            html += '</div>';
        } else {
            html += '<p>No envelopes found.</p>';
        }

        html += '</body></html>';

        return res.send(html);
    } catch(error) {
        const errorBody = error && error.response && error.response.body;
        // we can pull the DocuSign error code and message from the response body
        const errorCode = errorBody && errorBody.errorCode;
        const errorMessage = errorBody && errorBody.message;

        const response = {
            errorMessage: errorMessage,
            errorCode: errorCode,
            errorBody: error
        }
        res.send(response);
    }
});

function getEnvelope(envelopeId, req){
    const args = {
        accessToken: req.session.access_token,
        basePath: process.env.BASE_PATH,
        accountId: process.env.ACCOUNT_ID
    };

    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(args.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);

    return envelopesApi.getEnvelope(process.env.ACCOUNT_ID, envelopeId);
}

app.get("/envelopes/:id", async(req,res) => {
    try {
        await checkToken(req);
        const envelopeId = req.params.id;

        let envelope = await getEnvelope(envelopeId, req);
        let not_includ_values = ['customFieldsUri', 'documentsCombinedUri', 'notificationUri', 'templatesUri'];
        let urivalues = ['certificateUri', 'attachmentsUri', 'documentsUri', 'envelopeUri', 'recipientsUri'];
        // return res.send(envelope);

        let html = '<html><head><title>Envelope Details</title></head><body>';
        html += '<div style="border-radius: 10px; border: 1px solid black; display:flex; width: fit-content; padding: 15px; flex-direction: column; margin:auto;">';

        for(var i in envelope){
            if(envelope[i] !== undefined && !not_includ_values.includes(i)){
                html += '<div><strong>'+i+'</strong> : ';
                if(urivalues.includes(i)){
                    html += '<a href="'+envelope[i]+'">Click Here</a>';
                } else {
                    html += envelope[i]+'</div>';
                }
            }
        }

        html += '</div>';

        html += '</body></html>';

        return res.send(html);
    } catch (error) {
        console.error('Error fetching recipients:', error);
        res.status(400).send('Bad Request');
    }
});

function getEnvelopeRecipients(envelopeId, req){
    const args = {
        accessToken: req.session.access_token,
        basePath: process.env.BASE_PATH,
        accountId: process.env.ACCOUNT_ID
    };

    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(args.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);

    return envelopesApi.listRecipients(process.env.ACCOUNT_ID, envelopeId);
}

app.get("/envelopes/:id/recipients", async(req,res) => {
    try {
        const envelopeId = req.params.id;
        await checkToken(req);
        let recipients = await getEnvelopeRecipients(envelopeId, req);
        // return res.send(recipients);
        let carbon_copy_recipients = recipients.carbonCopies;
        recipients = recipients.signers;

        let html = '<html><head><title>Envelope Recipients</title></head><body>';
        html += '<h3> Envelope Id: '+envelopeId;
        html += '<h1>Envelope Recipients</h1>';

        if(carbon_copy_recipients.length > 0){
            html += '<h3> Carbon Copies Sent to : </h3>';
            html += '<div style="display: flex; flex-direction: row; flex-wrap: wrap; justify-content:space-between; ">';
            carbon_copy_recipients.forEach(carbon_copy_recipient => {
                html += `<div style="border: 1px solid black; margin-bottom: 20px; width:30%;">
                <div><strong>Recipient Name:</strong> ${carbon_copy_recipient.name} (${carbon_copy_recipient.email}), </div>
                <div><strong>Recipient ID:</strong> ${carbon_copy_recipient.recipientId}, </div>
                <div><strong>Status:</strong> ${carbon_copy_recipient.status}</div>
                </div>`;
            });
            html += '</div>';
        }

        if (recipients.length > 0) {
            html += '<h3> Signers : </h3>';
            html += '<div style="display: flex; flex-direction: row; flex-wrap: wrap; justify-content:space-between; ">';
                recipients.forEach(recipient => {
                    let json_data = {
                        envelopeId: envelopeId,
                        signerName: recipient.name,
                        signerEmail: recipient.email
                    };
                    json_data = encodeURIComponent(JSON.stringify(json_data));

                    html += `<div style="border: 1px solid black; margin-bottom: 20px; width:30%;">`;

                    html += `<div><strong>Recipient Name:</strong> ${recipient.name} (${recipient.email}),</div>
                    <div><strong>Recipient ID:</strong> ${recipient.recipientId},</div>
                    <div><strong>Status:</strong> ${recipient.status}</div>`;
                    // if(recipient.status != 'created' && recipient.status != 'completed'){
                        html += `<a href="/view_request?data=${json_data}">Click Here to Sign</a>`;
                    // }

                    html += '</div>';
                });
            html += '</div>';
        } else {
            html += '<p>No recipients found.</p>';
        }

        html += '</body></html>';

        res.send(html);
    } catch (error) {
        console.error('Error fetching recipients:', error);
        res.status(400).send('Bad Request');
    }

});

app.get("/envelopes/:id/documents", async(req,res) => {
    try{
        await checkToken(req);
        const envelopeId = req.params.id;
        const args = {
            accessToken: req.session.access_token,
            basePath: process.env.BASE_PATH,
            accountId: process.env.ACCOUNT_ID
        };

        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(args.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
        let envelopesApi = new docusign.EnvelopesApi(dsApiClient), results = null;

        results = await envelopesApi.listDocuments(args.accountId, envelopeId);

        if(results){
            const standardDocItems = [
                {name: 'Combined'   , type: 'content', documentId: 'combined'},
                {name: 'Zip archive', type: 'zip', documentId: 'archive'},
                {name: 'PDF Portfolio', type: 'portfolio', documentId: 'portfolio'}]
                // The certificate of completion is named "summary".
                // We give it a better name below.
            const envelopeDocItems = results.envelopeDocuments.map( doc =>
                       ({documentId: doc.documentId,
                        name: doc.documentId === "certificate" ?
                            "Certificate of completion" : doc.name,
                        type: doc.type}) )
            const envelopeDocuments = {envelopeId: envelopeId,
                        documents: standardDocItems.concat(envelopeDocItems)};
            req.session.envelopeDocuments = envelopeDocuments;

            if (envelopeDocuments) {
                // Prepare the select items
                documentOptions = envelopeDocuments.documents.map ( item =>
                    ({text: item.name, documentId: item.documentId}));
            }

            let html = '<html><head><title>Envelope Documents</title></head><body>';
            html += '<div style="border-radius: 50px; border: 1px solid black; display:flex; width: fit-content; padding: 15px; flex-direction: column; margin:15% 25% 20% 40%;">';
                html += '<h3> Envelope Id: '+envelopeId+'</h3>';
                html += '<form action="" method="post" data-busy="form-download" style="align-items: center;display: flex;flex-direction: column; margin-block-end: 0em;">';
                        html += '<label for="docSelect">Please Select Document: </label>';
                        html += '<select id="docSelect" name="docSelect" style="margin: 0.5rem 0;">';
                            for(let i of documentOptions){
                                html += '<option value="'+i.documentId+'">'+i.text+'</option>';
                            }
                        html += '<input type="submit" style="" />';
                html += '</form>';            
            html += '</div>';

            html += '</body></html>';
            return res.send(html);
        } else {
            return res.send(results);
        }

    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(400).send('Bad Request');
    }
});

async function getDocument(args){
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(args.basePath);
    dsApiClient.addDefaultHeader("Authorization", "Bearer " + args.accessToken);
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient),results = null;

    results = await envelopesApi.getDocument(
        args.accountId,
        args.envelopeDocuments.envelopeId,
        args.documentId
    );

    let docItem = args.envelopeDocuments.documents.find(
        (item) => item.documentId === args.documentId
      ),
      docName = docItem.name,
      hasPDFsuffix = docName.substr(docName.length - 4).toUpperCase() === ".PDF",
      pdfFile = hasPDFsuffix;
    // Add .pdf if it's a content or summary doc and doesn't already end in .pdf
    if (
      (docItem.type === "content" || docItem.type === "summary") &&
      !hasPDFsuffix
    ) {
      docName += ".pdf";
      pdfFile = true;
    }
    if (docItem.type === 'portfolio') {
      docName += ".pdf";
      pdfFile = true;
    }
    // Add .zip as appropriate
    if (docItem.type === "zip") {
      docName += ".zip";
    }
  
    // Return the file information
    // See https://stackoverflow.com/a/30625085/64904
    let mimetype;
    if (pdfFile) {
      mimetype = "application/pdf";
    } else if (docItem.type === "zip") {
      mimetype = "application/zip";
    } else {
      mimetype = "application/octet-stream";
    }
  
    return { mimetype: mimetype, docName: docName, fileBytes: results };
}

app.post("/envelopes/:id/documents", async(req,res) => {
    await checkToken(req);
    console.log(req.session.envelopeDocuments);
    let envelopeDocuments = await req.session.envelopeDocuments;
    const args = {
        accessToken: req.session.access_token,
        basePath: process.env.BASE_PATH,
        accountId: process.env.ACCOUNT_ID,
        documentId: req.body.docSelect,
        envelopeDocuments: envelopeDocuments
    }

    console.log(args);

    try {
        results = await getDocument(args);

        if (results) {
            // ***DS.snippet.2.start
            res.writeHead(200, {
                'Content-Type': results.mimetype,
                'Content-disposition': 'inline;filename=' + results.docName,
                'Content-Length': results.fileBytes.length
            });
            res.end(results.fileBytes, 'binary');
            // ***DS.snippet.2.end
        }
    } catch (error) {
        const errorBody = error && error.response && error.response.body;
        // we can pull the DocuSign error code and message from the response body
        const errorCode = errorBody && errorBody.errorCode
        const errorMessage = errorBody && errorBody.message;

        const response = {
            errorMessage: errorMessage,
            errorCode: errorCode,
            errorBody: error
        }
        res.send(response);
    }
});

app.get("/envelopes/:id/documents/:documentId", async(req,res) => {
    try{
        await checkToken(req);
        const envelopeId = req.params.id;
        const document_id = req.params.documentId;
        const args = {
            accessToken: req.session.access_token,
            basePath: process.env.BASE_PATH,
            accountId: process.env.ACCOUNT_ID
        };

        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(args.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
        let envelopesApi = new docusign.EnvelopesApi(dsApiClient), results = null;
        // await envelopesApi.getDocument(args.accountId, envelopeId, document_id)
        // .then((response) => {
        //   const documentData = response.body;
      
        //   // Save the document data to a file or process it as needed
        //   // For example, save it to a file named "document.pdf"
        //   const fs = require('fs');
        //   fs.writeFileSync('document.pdf', Buffer.from(documentData, 'base64'));
      
        //   console.log('Document downloaded successfully');
        // })
        results = await envelopesApi.getDocument(args.accountId, envelopeId, document_id, {});

        // console.log(results);

        await fs.writeFileSync('certificate.pdf',results);

        const filePath = 'certificate.pdf';

        // Read the contents of the file
        fs.readFile(filePath, (err, data) => {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=certificate.pdf');
            res.end(data);
        });
        // return res.send(results);

    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(400).send('Bad Request');
    }
});

app.get("/envelopes/:id/attachments", async(req,res) => {
    try{
        await checkToken(req);
        const envelopeId = req.params.id;
        const args = {
            accessToken: req.session.access_token,
            basePath: process.env.BASE_PATH,
            accountId: process.env.ACCOUNT_ID
        };

        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(args.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
        let envelopesApi = new docusign.EnvelopesApi(dsApiClient), results = null;

        results = await envelopesApi.listDocuments(args.accountId, envelopeId);

        return res.send(results);

    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(400).send('Bad Request');
    }
});

app.listen( process.env.PORT, () => {
    console.log("Connected Successfully at port :"+ process.env.PORT);
});

//https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=57b07e1e-363f-42ff-9891-bc3f5e505c89&redirect_uri=http://localhost:4000/