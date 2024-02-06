
- Do "npm install" to install all dependancy
- Rename .env.example file to .env file and add your credential of developer docusign account
- run nodemon app.js or node app.js command to run 
- Refer images folder to see the demo docusign project

## JWT access token (Refered 2nd YT video for this) Docusign Integration :-
- Create Developer account at docusign for free: https://go.docusign.com/o/sandbox/?postActivateUrl=https://developers.docusign.com/&_gl=1*1ned63o*_gcl_au*OTkwNTk2NTIyLjE2OTkyNDczOTI.*_ga*NTc1NTkxNzQyLjE2OTkyNDczOTI.*_ga_1TZ7S9D6BQ*MTcwMDE5NjM3NS4yMC4xLjE3MDAxOTY0MDguMjcuMC4w&_ga=2.182935142.1392131612.1700107332-575591742.1699247392

- Go to admin demo apps & keys
- Admin Demo Apps & keys: https://admindemo.docusign.com/apps-and-keys

- click on add apps and integration key to integrate your app with docusign
- After Creating edit the app

- Store this things to your .env file 
1. Integration Key
2. Secret Keys (optional - if any)
3. Private Key
4. Public Key

- To get private key and public key 
  -> click on generate rsa - remember you can view your private key and public key only once so store it 

- in additional setting -> write redirect url where you want to redirect after successfull signing
- then save it as it is

- Then Construct consent URI like below to configure your app with docusign:-
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=57b07e1e-****-****-****-************&redirect_uri=http://localhost:4000/
-> Here "57b07e1e-****-****-****-************" is integration key

- Reference

- YT Videos: 
1. How to use DocuSign: Step-by-Step Tutorial Demo in Docusign UI(concept of docusign): https://www.youtube.com/watch?v=CYxUVI8QYLw
2. Get an access token with JWT Authentication | Developer Education (Prerequisites for integrate docusign with your app) : https://www.youtube.com/watch?v=ebwN2HWpDQA
3. Postman API Challenge: Building a DocuSign Workflow | Developer Conference (Postman integration) : https://www.youtube.com/watch?v=kT7paM_izdM
or 
3. Build Your First DocuSign Integration | Developer Conference : https://www.youtube.com/watch?v=G4eCTnB_fx4
4. Quickstart Node js demo of docusign : https://www.youtube.com/watch?v=5iUq00IRaTk

- Docusign Developer pages:
1. Docusign Developer Portal: https://developers.docusign.com/docs/esign-rest-api/
2. Download Demo Node js app: https://developers.docusign.com/docs/esign-rest-api/quickstart/
3. Admin Demo Apps & keys: https://admindemo.docusign.com/authenticate?goTo=appsAndKeys&_gl=1*1qt388f*_gcl_au*OTkwNTk2NTIyLjE2OTkyNDczOTI.*_ga*NTc1NTkxNzQyLjE2OTkyNDczOTI.*_ga_1TZ7S9D6BQ*MTcwMDE5NjM3NS4yMC4xLjE3MDAxOTY0MTguMTcuMC4w&_ga=2.252066505.1392131612.1700107332-575591742.1699247392
4. Docusign How to Guides: https://developers.docusign.com/docs/esign-rest-api/how-to/
5. How to create a signable HTML document : https://developers.docusign.com/docs/esign-rest-api/how-to/creating-signable-html/
6. Create Sender Enable Disable options: https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createsender/
7. Docusign Webhooks: https://developers.docusign.com/platform/webhooks/connect/ 
8. Managing Envelopes: https://support.docusign.com/s/document-item?language=en_US&rsc_301&bundleId=oeq1643226594604&topicId=ghu1578456429097.html&_LANG=enus