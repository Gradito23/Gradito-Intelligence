11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM… Pretty-print 

{   
 "openapi": "3.1.0",   
 "info": {   
 "title": "Quo Public API",   
 "version": "1.0.0",   
 "description": "API for connecting with Quo.",   
 "contact": {   
 "name": "Quo Support",   
 "email": "support@quo.com",   
 "url": "https\://support.quo.com/"   
 },   
 "termsOfService": "https\://www\.quo.com/terms"   
 },   
 "paths": {   
 "/a2p-registration": {   
 "get": {   
 "tags": \[   
 "A2P Registration"   
 \],   
 "summary": "Get the A2P registration",   
 "description": "Get the organization's A2P (10DLC) registration. Organizations have at most one registration. Returns a 404 rather than a null \`data\` field when no registration exists yet.", 

 "operationId": "getA2PRegistration",   
 "parameters": \[   
 {   
 "in": "header",   
 "name": "Quo-Api-Version",   
 "required": true,   
 "schema": {   
 "type": "string",   
 "enum": \[   
 "2026-03-30"   
 \],   
 "description": "API version header. Supported values: 2026-03-30"  } 

 }   
 \],   
 "security": \[   
 {   
 "apiKey": \[\]   
 }   
 \],   
 "responses": {   
 "200": {   
 "description": "OK",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "data"   
 \],   
"properties": {   
 "data": {   
 "type": "object",   
"required": \[   
 "id",   
"draft",   
"status",   
"statusMessages",   
"autofillStatus",   
"type",   
"assignedPnId",   
"firstSubmittedAt",   
"createdAt",   
"updatedAt", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ0… 1/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "businessInfo",   
Pretty-print   
~~"messaging"~~   
 \],   
"properties": {   
 "id": {   
 "description": "The unique identifier of the A2P registration.", "examples": \[ 

 "RG123abc"   
 \],   
"example": "RG123abc",   
"type": "string",   
"pattern": "^RG(.\*)\$"   
 },   
"draft": {   
 "type": "boolean",   
"description": "True if the registration has not yet been   
submitted for carrier approval. Combine with \`status\` to tell submission states apart: \`draft: true, status: \\"pending\\"\` means not yet submitted; \`draft: false, status: \\"pending\\"\` means submitted and awaiting carrier approval." 

 },   
"status": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "pending"   
 },   
{   
 "type": "string",   
"const": "approved"   
 },   
{   
 "type": "string",   
"const": "rejected"   
 },   
{   
 "type": "string",   
"const": "failed"   
 }   
 \],   
"description": "The registration's overall status. \`pending\` is   
set both at creation and while awaiting carrier approval after submission — check \`draft\` to tell those two apart. \`rejected\` and \`failed\` both mean the registration must be resubmitted, which re-triggers billing.", 

 "examples": \[   
 "pending"   
 \],   
"example": "pending"   
 },   
"statusMessages": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "errorCode",   
"errorReason"   
 \],   
"properties": {   
 "errorCode": {   
 "type": "number",   
"description": "The carrier error code associated with this   
status message."   
 },   
"errorReason": {   
 "type": "string",   
"description": "A human-readable explanation of the   
status."   
 },   
"fieldName": {   
 "type": "string", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ0… 2/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "description": "The single business-profile field this   
Pretty-print   
~~message refers to, if any."~~   
 },   
"fields": {   
 "type": "array",   
"items": {   
 "type": "string"   
},   
"description": "The business-profile fields this message   
refers to, if any."   
 }   
 }   
 },   
"description": "Carrier-reported reasons for the current status,   
most relevant when \`status\` is \`rejected\` or \`failed\`."   
 },   
"autofillStatus": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "pending"   
 },   
{   
 "type": "string",   
"const": "in-progress"   
 },   
{   
 "type": "string",   
"const": "completed"   
 },   
{   
 "type": "string",   
"const": "failed"   
 }   
 \],   
"description": "Status of the automatic field-fill for this   
registration. \`completed\` means the messaging fields are generated and the registration can be submitted; \`pending\` or \`in-progress\` means submission is not yet allowed; \`failed\` means autofill did not complete and the registration must be updated and retried.",  "examples": \[ 

 "completed"   
 \],   
"example": "completed"   
 },   
"type": {   
 "anyOf": \[   
 {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "standard"   
 },   
{   
 "type": "string",   
"const": "lv-standard"   
 },   
{   
 "type": "string",   
"const": "starter"   
 },   
{   
 "type": "string",   
"const": "sole-prop"   
 }   
 \],   
"description": "The type of A2P registration.",   
"examples": \[   
 "standard"   
 \], 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ0… 3/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "example": "standard"   
Pretty-print   
 ~~},~~   
{   
 "type": "null"   
 }   
 \]   
 },   
"assignedPnId": {   
 "anyOf": \[   
 {   
 "type": "string",   
"pattern": "^PN(.\*)\$"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"firstSubmittedAt": {   
 "anyOf": \[   
 {   
 "description": "The timestamp the registration was first submitted for carrier approval.", 

 "type": "string",   
"format": "date-time"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"createdAt": {   
 "description": "The timestamp the registration was created.", "type": "string", 

"format": "date-time"   
 },   
"updatedAt": {   
 "description": "The timestamp the registration was last updated.", 

 "type": "string",   
"format": "date-time"   
 },   
"businessInfo": {   
 "type": "object",   
"required": \[   
 "name",   
"alternateName",   
"businessType",   
"companyType",   
"industry",   
"employeeCount",   
"avgDailyCallVolume",   
"regionsOfOperation",   
"websiteUrl",   
"idType",   
"idNumber",   
"ticker",   
"exchange",   
"address",   
"personOfContact"   
 \],   
"properties": {   
 "name": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The legal or registered name of the   
business.",   
"examples": \[ 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ0… 4/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "Acme Inc"   
Pretty-print   
 ~~\],~~   
"example": "Acme Inc"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"alternateName": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "An alternate or doing-business-as name   
for the business."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"businessType": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The legal structure of the business.",   
"examples": \[   
 "Limited Liability Corporation"   
\],   
"example": "Limited Liability Corporation"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"companyType": {   
 "anyOf": \[   
 {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Private"   
 },   
{   
 "type": "string",   
"const": "Public"   
 },   
{   
 "type": "string",   
"const": "Non-profit"   
 },   
{   
 "type": "string",   
"const": "Government"   
 }   
 \],   
"description": "The type of company: one of \`Private\`,   
\`Public\`, \`Non-profit\`, \`Government\`.",   
"examples": \[   
 "Private"   
\],   
"example": "Private"   
 },   
{   
 "type": "null"   
}   
 \]   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ0… 5/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "industry": {   
Pretty-print   
 ~~"anyOf": \[~~   
 {   
 "type": "string",   
"description": "The industry the business operates in."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"employeeCount": {   
 "anyOf": \[   
 {   
 "type": "number",   
"description": "The number of employees at the business."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"avgDailyCallVolume": {   
 "anyOf": \[   
 {   
 "type": "number",   
"description": "The business's average daily call   
volume."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"regionsOfOperation": {   
 "type": "array",   
"items": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Africa"   
 },   
{   
 "type": "string",   
"const": "Asia"   
 },   
{   
 "type": "string",   
"const": "Europe"   
 },   
{   
 "type": "string",   
"const": "Latin America"   
 },   
{   
 "type": "string",   
"const": "USA and Canada"   
 }   
 \]   
 },   
"description": "The regions the business operates in. Each   
entry is one of \`Africa\`, \`Asia\`, \`Europe\`, \`Latin America\`, \`USA and Canada\`."  }, 

"websiteUrl": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business's website URL.",   
"format": "uri" 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ0… 6/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print   
~~{~~   
 "type": "null"   
}   
 \]   
 },   
"idType": {   
 "anyOf": \[   
 {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Australia: Company Number from ASIC (ACN)"   
 },   
{   
 "type": "string",   
"const": "Canada: Business Number (BIN)"   
 },   
{   
 "type": "string",   
"const": "Canada: Canadian Business Number (BN-9)"   
 },   
{   
 "type": "string",   
"const": "Canada: Canadian Corporation Number (CCN)"   
 },   
{   
 "type": "string",   
"const": "Estonia: VAT Number"   
 },   
{   
 "type": "string",   
"const": "Great Britain: Company Number"   
 },   
{   
 "type": "string",   
"const": "India: Corporate Identity Number"   
 },   
{   
 "type": "string",   
"const": "Israel: Registration Number"   
 },   
{   
 "type": "string",   
"const": "Romania: VAT Registration Number"   
 },   
{   
 "type": "string",   
"const": "USA: DUNS Number (Dun & Bradstreet)"   
 },   
{   
 "type": "string",   
"const": "USA: Employer Identification Number (EIN)"   
 },   
{   
 "type": "string",   
"const": "Other"   
 }   
 \],   
"description": "The type of the business's government   
issued tax ID: one of \`Australia: Company Number from ASIC (ACN)\`, \`Canada: Business Number (BIN)\`, \`Canada: Canadian Business Number (BN-9)\`, \`Canada: Canadian Corporation Number (CCN)\`, \`Estonia: VAT Number\`, \`Great Britain: Company Number\`, \`India: Corporate Identity Number\`, \`Israel: Registration Number\`, \`Romania: VAT Registration Number\`, \`USA: DUNS Number (Dun & Bradstreet)\`, \`USA: Employer Identification Number (EIN)\`, \`Other\`.",  "examples": \[ 

 "USA: Employer Identification Number (EIN)" \], 

"example": "USA: Employer Identification Number (EIN)" 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ0… 7/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print   
~~{~~   
 "type": "null"   
}   
 \]   
 },   
"idNumber": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business's government-issued tax ID   
number."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"ticker": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business's stock ticker symbol, if   
publicly traded."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"exchange": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The stock exchange the business's ticker   
is listed on, if publicly traded."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"address": {   
 "type": "object",   
"required": \[   
 "line1",   
"line2",   
"city",   
"region",   
"postalCode",   
"country"   
 \],   
"properties": {   
 "line1": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The first line of the business's   
registered address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"line2": {   
 "anyOf": \[   
 {   
 "type": "string", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ0… 8/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "description": "The second line of the business's   
Pretty-print   
~~registered address."~~   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"city": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The city of the business's registered   
address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"region": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The state or region of the business's   
registered address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"postalCode": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The postal code of the business's   
registered address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"country": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The country of the business's   
registered address.",   
"examples": \[   
 "US"   
\],   
"example": "US"   
 },   
{   
 "type": "null"   
}   
 \]   
 }   
 }   
 },   
"personOfContact": {   
 "type": "object",   
"required": \[   
 "firstName",   
"lastName",   
"jobTitle",   
"jobPosition", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ0… 9/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "email",   
Pretty-print   
~~"phoneNumber"~~   
 \],   
"properties": {   
 "firstName": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The first name of the business   
contact submitting this registration."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"lastName": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The last name of the business contact   
submitting this registration."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"jobTitle": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The job title of the business contact   
submitting this registration."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"jobPosition": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The job position of the business   
contact submitting this registration."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"email": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business contact's email   
address.",   
"format": "email"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"phoneNumber": {   
 "anyOf": \[   
 {   
 "type": "string", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 10/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "description": "The business contact's phone number."   
Pretty-print   
 ~~},~~   
{   
 "type": "null"   
}   
 \]   
 }   
 }   
 }   
 }   
 },   
"messaging": {   
 "type": "object",   
"required": \[   
 "useCase",   
"personalUse",   
"consent"   
 \],   
"properties": {   
 "useCase": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The messaging use case this registration   
was created for."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"personalUse": {   
 "anyOf": \[   
 {   
 "type": "boolean",   
"description": "Whether this registration is for an   
individual sending messages personally."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"consent": {   
 "anyOf": \[   
 {   
 "type": "object",   
"properties": {   
 "digitalForm": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 11/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "storeUrl": {   
Pretty-print   
 ~~"type": "string",~~   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"mobileApp": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"onSite": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 12/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM… requested through this channel."   
Pretty-print   
 ~~},~~   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"other": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"physicalForm": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": { 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 13/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "type": "boolean",   
Pretty-print   
~~"description": "Whether this consent channel is~~   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"textMessage": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 14/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "verbal": {   
Pretty-print   
 ~~"type": "object",~~   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"websiteForm": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 15/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "url": {   
Pretty-print   
 ~~"type": "string",~~   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"written": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 }   
 }   
 },   
{   
 "type": "null"   
}   
 \]   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "400": {   
 "description": "Bad Request",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 16/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "docs",   
Pretty-print   
~~"title"~~   
 \],   
"properties": {   
 "message": {   
 "type": "string"   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": {   
 "type": "string",   
"const": "Bad Request"   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "The input was invalid",   
"docs": "https\://quo.com/docs",   
"title": "Bad Request",   
"trace": "6897907457496870895"   
 }   
 }   
 }   
 },   
 "401": {   
 "description": "Unauthorized",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message",   
"docs",   
"title"   
 \],   
"properties": { 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 17/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "message": {   
Pretty-print   
 ~~"type": "string"~~   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": {   
 "type": "string",   
"const": "Unauthorized"   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "Unauthorized",   
"docs": "https\://quo.com/docs",   
"title": "Unauthorized",   
"trace": "6897907457496870895"   
 }   
 }   
 }   
 },   
 "403": {   
 "description": "Forbidden",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message",   
"docs",   
"title"   
 \],   
"properties": {   
 "message": {   
 "type": "string"   
 },   
"docs": { 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 18/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "type": "string",   
Pretty-print   
~~"const": "https\://quo.com/docs"~~   
 },   
"title": {   
 "type": "string",   
"const": "Forbidden"   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "User is forbidden to perform this action", "docs": "https\://quo.com/docs", 

"title": "Forbidden",   
"trace": "6897907457496870895"   
 }   
 }   
 }   
 },   
 "404": {   
 "description": "Not Found",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message",   
"docs",   
"title"   
 \],   
"properties": {   
 "message": {   
 "type": "string"   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": { 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 19/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "type": "string",   
Pretty-print   
~~"const": "Not Found"~~   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "The organization has no A2P registration", "docs": "https\://quo.com/docs", 

"title": "Not Found",   
"trace": "6897907457496870895"   
 }   
 }   
 }   
 },   
 "500": {   
 "description": "Unexpected Error",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message",   
"docs",   
"title"   
 \],   
"properties": {   
 "message": {   
 "type": "string"   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": {   
 "type": "string",   
"const": "Unexpected"   
 },   
"trace": { 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 20/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "type": "string"   
Pretty-print   
 ~~},~~   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "We have encountered an unknown error",   
"docs": "https\://quo.com/docs",   
"title": "Unexpected",   
"trace": "6897907457496870895"   
 }   
 }   
 }   
 }   
 }   
 },   
 "post": {   
 "tags": \[   
 "A2P Registration"   
 \],   
 "summary": "Create the A2P registration",   
 "description": "Create the organization's A2P (10DLC) draft registration. Organizations have at most one registration, so this returns 409 if one already exists.",  "operationId": "createA2PRegistration", 

 "parameters": \[   
 {   
 "in": "header",   
 "name": "Quo-Api-Version",   
 "required": true,   
 "schema": {   
 "type": "string",   
 "enum": \[   
 "2026-03-30"   
 \],   
 "description": "API version header. Supported values: 2026-03-30"  } 

 }   
 \],   
 "security": \[   
 {   
 "apiKey": \[\]   
 } 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 21/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  \],   
Pretty-print   
 ~~"requestBody": {~~   
 "required": true,   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
 "required": \[   
 "name",   
"businessType",   
"companyType",   
"industry",   
"employeeCount",   
"avgDailyCallVolume",   
"regionsOfOperation",   
"websiteUrl",   
"idType",   
"idNumber",   
"address",   
"personOfContact",   
"messageTypes"   
 \],   
 "properties": {   
 "name": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The legal or registered name of the business.",   
"examples": \[   
 "Acme Inc"   
 \],   
"example": "Acme Inc"   
 },   
"alternateName": {   
 "anyOf": \[   
 {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "An alternate or doing-business-as name for the   
business.",   
 "examples": \[   
 "Acme"   
 \],   
"example": "Acme"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"businessType": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Sole Proprietorship"   
 },   
{   
 "type": "string",   
"const": "Partnership"   
 },   
{   
 "type": "string",   
"const": "Corporation"   
 },   
{   
 "type": "string",   
"const": "Co-operative"   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 22/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  {   
Pretty-print   
 ~~"type": "string",~~   
"const": "Limited Liability Corporation"   
 },   
{   
 "type": "string",   
"const": "Non-profit Corporation"   
 }   
 \],   
"description": "The legal structure of the business: one of \`Sole   
Proprietorship\`, \`Partnership\`, \`Corporation\`, \`Co-operative\`, \`Limited Liability Corporation\`, \`Non-profit Corporation\`.", 

 "examples": \[   
 "Limited Liability Corporation"   
 \],   
"example": "Limited Liability Corporation"   
 },   
"companyType": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Private"   
 },   
{   
 "type": "string",   
"const": "Public"   
 },   
{   
 "type": "string",   
"const": "Non-profit"   
 },   
{   
 "type": "string",   
"const": "Government"   
 }   
 \],   
"description": "The type of company. \`ticker\` and \`exchange\` are   
required when this is \`Public\`.",   
 "examples": \[   
 "Private"   
 \],   
"example": "Private"   
 },   
"industry": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Agriculture"   
 },   
{   
 "type": "string",   
"const": "Automotive"   
 },   
{   
 "type": "string",   
"const": "Banking"   
 },   
{   
 "type": "string",   
"const": "Consumer"   
 },   
{   
 "type": "string",   
"const": "Education"   
 },   
{   
 "type": "string",   
"const": "Electronics"   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 23/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  {   
Pretty-print   
 ~~"type": "string",~~   
"const": "Energy"   
 },   
{   
 "type": "string",   
"const": "Engineering"   
 },   
{   
 "type": "string",   
"const": "Fast moving consumer goods"   
 },   
{   
 "type": "string",   
"const": "Financial"   
 },   
{   
 "type": "string",   
"const": "Fintech"   
 },   
{   
 "type": "string",   
"const": "Food and beverage"   
 },   
{   
 "type": "string",   
"const": "Government"   
 },   
{   
 "type": "string",   
"const": "Healthcare"   
 },   
{   
 "type": "string",   
"const": "Hospitality"   
 },   
{   
 "type": "string",   
"const": "Insurance"   
 },   
{   
 "type": "string",   
"const": "Jewelry"   
 },   
{   
 "type": "string",   
"const": "Legal"   
 },   
{   
 "type": "string",   
"const": "Manufacturing"   
 },   
{   
 "type": "string",   
"const": "Media"   
 },   
{   
 "type": "string",   
"const": "Not for profit"   
 },   
{   
 "type": "string",   
"const": "Oil and gas"   
 },   
{   
 "type": "string",   
"const": "Online"   
 },   
{ 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 24/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "type": "string",   
Pretty-print   
~~"const": "Raw materials"~~   
 },   
{   
 "type": "string",   
"const": "Real estate"   
 },   
{   
 "type": "string",   
"const": "Religion"   
 },   
{   
 "type": "string",   
"const": "Retail"   
 },   
{   
 "type": "string",   
"const": "Technology"   
 },   
{   
 "type": "string",   
"const": "Telecommunications"   
 },   
{   
 "type": "string",   
"const": "Transportation"   
 },   
{   
 "type": "string",   
"const": "Travel"   
 }   
 \],   
"description": "The industry the business operates in: one of   
\`Agriculture\`, \`Automotive\`, \`Banking\`, \`Consumer\`, \`Education\`, \`Electronics\`, \`Energy\`, \`Engineering\`, \`Fast moving consumer goods\`, \`Financial\`, \`Fintech\`, \`Food and beverage\`, \`Government\`, \`Healthcare\`, \`Hospitality\`, \`Insurance\`, \`Jewelry\`, \`Legal\`, \`Manufacturing\`, \`Media\`, \`Not for profit\`, \`Oil and gas\`, \`Online\`, \`Raw materials\`, \`Real estate\`, \`Religion\`, \`Retail\`, \`Technology\`, \`Telecommunications\`, \`Transportation\`, \`Travel\`.", 

 "examples": \[   
 "Technology"   
 \],   
"example": "Technology"   
 },   
"employeeCount": {   
 "type": "integer",   
"minimum": 1,   
"description": "The number of employees at the business.",   
"examples": \[   
 25   
 \],   
"example": 25   
 },   
"avgDailyCallVolume": {   
 "type": "integer",   
"minimum": 1,   
"description": "The business's average daily call volume.",   
"examples": \[   
 100   
 \],   
"example": 100   
 },   
"regionsOfOperation": {   
 "type": "array",   
"items": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Africa" 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 25/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print   
~~{~~   
 "type": "string",   
"const": "Asia"   
 },   
{   
 "type": "string",   
"const": "Europe"   
 },   
{   
 "type": "string",   
"const": "Latin America"   
 },   
{   
 "type": "string",   
"const": "USA and Canada"   
 }   
 \]   
 },   
"minItems": 1,   
"maxItems": 5,   
"uniqueItems": true,   
"description": "The regions the business operates in. Each entry is one of \`Africa\`, \`Asia\`, \`Europe\`, \`Latin America\`, \`USA and Canada\`.", 

 "examples": \[   
 \[   
 "USA and Canada"   
 \]   
 \],   
"example": \[   
 "USA and Canada"   
 \]   
 },   
"websiteUrl": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"format": "uri",   
"description": "The business's website URL.",   
"examples": \[   
 "https\://acme.example"   
 \],   
"example": "https\://acme.example"   
 },   
"idType": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "USA: Employer Identification Number (EIN)"   
 },   
{   
 "type": "string",   
"const": "Canada: Canadian Business Number (BN-9)"   
 },   
{   
 "type": "string",   
"const": "Great Britain: Company Number"   
 },   
{   
 "type": "string",   
"const": "Australia: Company Number from ASIC (ACN)"   
 },   
{   
 "type": "string",   
"const": "India: Corporate Identity Number"   
 },   
{   
 "type": "string",   
"const": "Estonia: VAT Number" 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 26/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print   
~~{~~   
 "type": "string",   
"const": "Romania: VAT Registration Number"   
 },   
{   
 "type": "string",   
"const": "Israel: Registration Number"   
 },   
{   
 "type": "string",   
"const": "Other"   
 }   
 \],   
"description": "The type of the business's government-issued tax ID:   
one of \`USA: Employer Identification Number (EIN)\`, \`Canada: Canadian Business Number (BN 9)\`, \`Great Britain: Company Number\`, \`Australia: Company Number from ASIC (ACN)\`, \`India: Corporate Identity Number\`, \`Estonia: VAT Number\`, \`Romania: VAT Registration Number\`, \`Israel: Registration Number\`, \`Other\`.", 

 "examples": \[   
 "USA: Employer Identification Number (EIN)"   
 \],   
"example": "USA: Employer Identification Number (EIN)"   
 },   
"idNumber": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The business's government-issued tax ID number. An EIN   
must carry exactly nine digits, and separators such as the dash in \`12-3456789\` are ignored. A Canadian BN-9 must be exactly nine digits with no separators.",  "examples": \[ 

 "12-3456789"   
 \],   
"example": "12-3456789"   
 },   
"ticker": {   
 "anyOf": \[   
 {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The business's stock ticker symbol. Required when   
\`companyType\` is \`Public\`.",   
 "examples": \[   
 "ACME"   
 \],   
"example": "ACME"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"exchange": {   
 "anyOf": \[   
 {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "NASDAQ"   
 },   
{   
 "type": "string",   
"const": "NYSE"   
 },   
{   
 "type": "string",   
"const": "AMEX" 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 27/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print   
~~{~~   
 "type": "string",   
"const": "AMX"   
 },   
{   
 "type": "string",   
"const": "ASX"   
 },   
{   
 "type": "string",   
"const": "B3"   
 },   
{   
 "type": "string",   
"const": "BME"   
 },   
{   
 "type": "string",   
"const": "BSE"   
 },   
{   
 "type": "string",   
"const": "FRA"   
 },   
{   
 "type": "string",   
"const": "ICEX"   
 },   
{   
 "type": "string",   
"const": "JPX"   
 },   
{   
 "type": "string",   
"const": "JSE"   
 },   
{   
 "type": "string",   
"const": "KRX"   
 },   
{   
 "type": "string",   
"const": "LON"   
 },   
{   
 "type": "string",   
"const": "NSE"   
 },   
{   
 "type": "string",   
"const": "OMX"   
 },   
{   
 "type": "string",   
"const": "SEHK"   
 },   
{   
 "type": "string",   
"const": "SGX"   
 },   
{   
 "type": "string",   
"const": "SSE"   
 },   
{   
 "type": "string",   
"const": "STO"   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 28/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  {   
Pretty-print   
 ~~"type": "string",~~   
"const": "SWX"   
 },   
{   
 "type": "string",   
"const": "SZSE"   
 },   
{   
 "type": "string",   
"const": "TSX"   
 },   
{   
 "type": "string",   
"const": "TWSE"   
 },   
{   
 "type": "string",   
"const": "VSE"   
 },   
{   
 "type": "string",   
"const": "Other"   
 }   
 \],   
"description": "The stock exchange the business's ticker is listed   
on. Required when \`companyType\` is \`Public\`. One of \`NASDAQ\`, \`NYSE\`, \`AMEX\`, \`AMX\`, \`ASX\`, \`B3\`, \`BME\`, \`BSE\`, \`FRA\`, \`ICEX\`, \`JPX\`, \`JSE\`, \`KRX\`, \`LON\`, \`NSE\`, \`OMX\`, \`SEHK\`, \`SGX\`, \`SSE\`, \`STO\`, \`SWX\`, \`SZSE\`, \`TSX\`, \`TWSE\`, \`VSE\`, \`Other\`.", 

 "examples": \[   
 "NASDAQ"   
 \],   
"example": "NASDAQ"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"address": {   
 "type": "object",   
"required": \[   
 "line1",   
"city",   
"region",   
"postalCode",   
"country"   
 \],   
"properties": {   
 "line1": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The first line of the business's registered   
address.",   
 "examples": \[   
 "1 Main St"   
 \],   
"example": "1 Main St"   
 },   
"line2": {   
 "anyOf": \[   
 {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The second line of the business's registered   
address.",   
 "examples": \[ 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 29/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "Suite 200"   
Pretty-print   
 ~~\],~~   
"example": "Suite 200"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"city": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The city of the business's registered address.",   
"examples": \[   
 "San Francisco"   
 \],   
"example": "San Francisco"   
 },   
"region": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The state or region of the business's registered   
address.",   
 "examples": \[   
 "CA"   
 \],   
"example": "CA"   
 },   
"postalCode": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The postal code of the business's registered   
address.",   
 "examples": \[   
 "94110"   
 \],   
"example": "94110"   
 },   
"country": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The country of the business's registered address.",   
"examples": \[   
 "US"   
 \],   
"example": "US"   
 }   
 }   
 },   
"personOfContact": {   
 "type": "object",   
"required": \[   
 "firstName",   
"lastName",   
"jobTitle",   
"jobPosition",   
"email",   
"phoneNumber"   
 \],   
"properties": {   
 "firstName": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The first name of the business contact submitting 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 30/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM… this registration.",   
Pretty-print   
 ~~"examples": \[~~   
 "Ada"   
 \],   
"example": "Ada"   
 },   
"lastName": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The last name of the business contact submitting   
this registration.",   
 "examples": \[   
 "Lovelace"   
 \],   
"example": "Lovelace"   
 },   
"jobTitle": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The job title of the business contact submitting   
this registration.",   
 "examples": \[   
 "CTO"   
 \],   
"example": "CTO"   
 },   
"jobPosition": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Other"   
 },   
{   
 "type": "string",   
"const": "Director"   
 },   
{   
 "type": "string",   
"const": "GM"   
 },   
{   
 "type": "string",   
"const": "VP"   
 },   
{   
 "type": "string",   
"const": "CEO"   
 },   
{   
 "type": "string",   
"const": "CFO"   
 },   
{   
 "type": "string",   
"const": "General Counsel"   
 }   
 \],   
"description": "The job position of the business contact submitting   
this registration: one of \`Other\`, \`Director\`, \`GM\`, \`VP\`, \`CEO\`, \`CFO\`, \`General Counsel\`.", 

 "examples": \[   
 "Director"   
 \],   
"example": "Director"   
 },   
"email": {   
 "type": "string", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 31/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "minLength": 1,   
Pretty-print   
~~"maxLength": 255,~~   
"format": "email",   
"description": "The business contact's email address.",   
"examples": \[   
 "ada@acme.example"   
 \],   
"example": "ada@acme.example"   
 },   
"phoneNumber": {   
 "type": "string",   
"maxLength": 255,   
"pattern": "^\\\\+\[1-9\]\\\\d{1,14}\$",   
"description": "The business contact's phone number, in E.164   
format.",   
 "examples": \[   
 "+15551234567"   
 \],   
"example": "+15551234567"   
 }   
 }   
 },   
"messageTypes": {   
 "type": "array",   
"items": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "appointments\_scheduling"   
 },   
{   
 "type": "string",   
"const": "transactional\_notifications"   
 },   
{   
 "type": "string",   
"const": "customer\_support"   
 },   
{   
 "type": "string",   
"const": "verification\_security"   
 },   
{   
 "type": "string",   
"const": "promotions\_announcements"   
 }   
 \]   
 },   
"minItems": 1,   
"description": "The message-use types that autofill uses for this   
request. The registration does not store this value: send it again on any later request that starts autofill.", 

 "examples": \[   
 \[   
 "customer\_support",   
"transactional\_notifications"   
 \]   
 \],   
"example": \[   
 "customer\_support",   
"transactional\_notifications"   
 \]   
 }   
 }   
 }   
 }   
 }   
 },   
 "responses": { 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 32/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "201": {   
Pretty-print   
 ~~"description": "Created",~~   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "data"   
 \],   
"properties": {   
 "data": {   
 "type": "object",   
"required": \[   
 "id",   
"draft",   
"status",   
"statusMessages",   
"autofillStatus",   
"type",   
"assignedPnId",   
"firstSubmittedAt",   
"createdAt",   
"updatedAt",   
"businessInfo",   
"messaging"   
 \],   
"properties": {   
 "id": {   
 "description": "The unique identifier of the A2P registration.", "examples": \[ 

 "RG123abc"   
 \],   
"example": "RG123abc",   
"type": "string",   
"pattern": "^RG(.\*)\$"   
 },   
"draft": {   
 "type": "boolean",   
"description": "True if the registration has not yet been   
submitted for carrier approval. Combine with \`status\` to tell submission states apart: \`draft: true, status: \\"pending\\"\` means not yet submitted; \`draft: false, status: \\"pending\\"\` means submitted and awaiting carrier approval." 

 },   
"status": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "pending"   
 },   
{   
 "type": "string",   
"const": "approved"   
 },   
{   
 "type": "string",   
"const": "rejected"   
 },   
{   
 "type": "string",   
"const": "failed"   
 }   
 \],   
"description": "The registration's overall status. \`pending\` is   
set both at creation and while awaiting carrier approval after submission — check \`draft\` to tell those two apart. \`rejected\` and \`failed\` both mean the registration must be resubmitted, which re-triggers billing.", 

 "examples": \[   
 "pending"   
 \], 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 33/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "example": "pending"   
Pretty-print   
 ~~},~~   
"statusMessages": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "errorCode",   
"errorReason"   
 \],   
"properties": {   
 "errorCode": {   
 "type": "number",   
"description": "The carrier error code associated with this   
status message."   
 },   
"errorReason": {   
 "type": "string",   
"description": "A human-readable explanation of the   
status."   
 },   
"fieldName": {   
 "type": "string",   
"description": "The single business-profile field this   
message refers to, if any."   
 },   
"fields": {   
 "type": "array",   
"items": {   
 "type": "string"   
},   
"description": "The business-profile fields this message   
refers to, if any."   
 }   
 }   
 },   
"description": "Carrier-reported reasons for the current status,   
most relevant when \`status\` is \`rejected\` or \`failed\`."   
 },   
"autofillStatus": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "pending"   
 },   
{   
 "type": "string",   
"const": "in-progress"   
 },   
{   
 "type": "string",   
"const": "completed"   
 },   
{   
 "type": "string",   
"const": "failed"   
 }   
 \],   
"description": "Status of the automatic field-fill for this   
registration. \`completed\` means the messaging fields are generated and the registration can be submitted; \`pending\` or \`in-progress\` means submission is not yet allowed; \`failed\` means autofill did not complete and the registration must be updated and retried.",  "examples": \[ 

 "completed"   
 \],   
"example": "completed"   
 },   
"type": {   
 "anyOf": \[ 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 34/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  {   
Pretty-print   
 ~~"anyOf": \[~~   
 {   
 "type": "string",   
"const": "standard"   
 },   
{   
 "type": "string",   
"const": "lv-standard"   
 },   
{   
 "type": "string",   
"const": "starter"   
 },   
{   
 "type": "string",   
"const": "sole-prop"   
 }   
 \],   
"description": "The type of A2P registration.",   
"examples": \[   
 "standard"   
 \],   
"example": "standard"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"assignedPnId": {   
 "anyOf": \[   
 {   
 "type": "string",   
"pattern": "^PN(.\*)\$"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"firstSubmittedAt": {   
 "anyOf": \[   
 {   
 "description": "The timestamp the registration was first submitted for carrier approval.", 

 "type": "string",   
"format": "date-time"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"createdAt": {   
 "description": "The timestamp the registration was created.", "type": "string", 

"format": "date-time"   
 },   
"updatedAt": {   
 "description": "The timestamp the registration was last updated.", 

 "type": "string",   
"format": "date-time"   
 },   
"businessInfo": {   
 "type": "object",   
"required": \[   
 "name", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 35/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "alternateName",   
Pretty-print   
~~"businessType",~~   
"companyType",   
"industry",   
"employeeCount",   
"avgDailyCallVolume",   
"regionsOfOperation",   
"websiteUrl",   
"idType",   
"idNumber",   
"ticker",   
"exchange",   
"address",   
"personOfContact"   
 \],   
"properties": {   
 "name": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The legal or registered name of the   
business.",   
"examples": \[   
 "Acme Inc"   
\],   
"example": "Acme Inc"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"alternateName": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "An alternate or doing-business-as name   
for the business."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"businessType": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The legal structure of the business.",   
"examples": \[   
 "Limited Liability Corporation"   
\],   
"example": "Limited Liability Corporation"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"companyType": {   
 "anyOf": \[   
 {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Private"   
 },   
{   
 "type": "string", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 36/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "const": "Public"   
Pretty-print   
 ~~},~~   
{   
 "type": "string",   
"const": "Non-profit"   
 },   
{   
 "type": "string",   
"const": "Government"   
 }   
 \],   
"description": "The type of company: one of \`Private\`,   
\`Public\`, \`Non-profit\`, \`Government\`.",   
"examples": \[   
 "Private"   
\],   
"example": "Private"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"industry": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The industry the business operates in."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"employeeCount": {   
 "anyOf": \[   
 {   
 "type": "number",   
"description": "The number of employees at the business."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"avgDailyCallVolume": {   
 "anyOf": \[   
 {   
 "type": "number",   
"description": "The business's average daily call   
volume."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"regionsOfOperation": {   
 "type": "array",   
"items": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Africa"   
 },   
{   
 "type": "string",   
"const": "Asia"   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 37/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  {   
Pretty-print   
 ~~"type": "string",~~   
"const": "Europe"   
 },   
{   
 "type": "string",   
"const": "Latin America"   
 },   
{   
 "type": "string",   
"const": "USA and Canada"   
 }   
 \]   
 },   
"description": "The regions the business operates in. Each   
entry is one of \`Africa\`, \`Asia\`, \`Europe\`, \`Latin America\`, \`USA and Canada\`."  }, 

"websiteUrl": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business's website URL.",   
"format": "uri"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"idType": {   
 "anyOf": \[   
 {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Australia: Company Number from ASIC (ACN)"   
 },   
{   
 "type": "string",   
"const": "Canada: Business Number (BIN)"   
 },   
{   
 "type": "string",   
"const": "Canada: Canadian Business Number (BN-9)"   
 },   
{   
 "type": "string",   
"const": "Canada: Canadian Corporation Number (CCN)"   
 },   
{   
 "type": "string",   
"const": "Estonia: VAT Number"   
 },   
{   
 "type": "string",   
"const": "Great Britain: Company Number"   
 },   
{   
 "type": "string",   
"const": "India: Corporate Identity Number"   
 },   
{   
 "type": "string",   
"const": "Israel: Registration Number"   
 },   
{   
 "type": "string",   
"const": "Romania: VAT Registration Number"   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 38/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  {   
Pretty-print   
 ~~"type": "string",~~   
"const": "USA: DUNS Number (Dun & Bradstreet)"   
 },   
{   
 "type": "string",   
"const": "USA: Employer Identification Number (EIN)"   
 },   
{   
 "type": "string",   
"const": "Other"   
 }   
 \],   
"description": "The type of the business's government   
issued tax ID: one of \`Australia: Company Number from ASIC (ACN)\`, \`Canada: Business Number (BIN)\`, \`Canada: Canadian Business Number (BN-9)\`, \`Canada: Canadian Corporation Number (CCN)\`, \`Estonia: VAT Number\`, \`Great Britain: Company Number\`, \`India: Corporate Identity Number\`, \`Israel: Registration Number\`, \`Romania: VAT Registration Number\`, \`USA: DUNS Number (Dun & Bradstreet)\`, \`USA: Employer Identification Number (EIN)\`, \`Other\`.",  "examples": \[ 

 "USA: Employer Identification Number (EIN)" \], 

"example": "USA: Employer Identification Number (EIN)"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"idNumber": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business's government-issued tax ID   
number."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"ticker": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business's stock ticker symbol, if   
publicly traded."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"exchange": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The stock exchange the business's ticker   
is listed on, if publicly traded."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"address": {   
 "type": "object",   
"required": \[   
 "line1", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 39/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "line2",   
Pretty-print   
~~"city",~~   
"region",   
"postalCode",   
"country"   
 \],   
"properties": {   
 "line1": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The first line of the business's   
registered address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"line2": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The second line of the business's   
registered address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"city": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The city of the business's registered   
address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"region": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The state or region of the business's   
registered address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"postalCode": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The postal code of the business's   
registered address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"country": {   
 "anyOf": \[ 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 40/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  {   
Pretty-print   
 ~~"type": "string",~~   
"description": "The country of the business's   
registered address.",   
"examples": \[   
 "US"   
\],   
"example": "US"   
 },   
{   
 "type": "null"   
}   
 \]   
 }   
 }   
 },   
"personOfContact": {   
 "type": "object",   
"required": \[   
 "firstName",   
"lastName",   
"jobTitle",   
"jobPosition",   
"email",   
"phoneNumber"   
 \],   
"properties": {   
 "firstName": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The first name of the business   
contact submitting this registration."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"lastName": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The last name of the business contact   
submitting this registration."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"jobTitle": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The job title of the business contact   
submitting this registration."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"jobPosition": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The job position of the business   
contact submitting this registration." 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 41/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print 

~~{~~   
 "type": "null"   
}   
 \]   
 },   
"email": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business contact's email   
address.",   
"format": "email"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"phoneNumber": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business contact's phone number."   
 },   
{   
 "type": "null"   
}   
 \]   
 }   
 }   
 }   
 }   
 },   
"messaging": {   
 "type": "object",   
"required": \[   
 "useCase",   
"personalUse",   
"consent"   
 \],   
"properties": {   
 "useCase": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The messaging use case this registration   
was created for."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"personalUse": {   
 "anyOf": \[   
 {   
 "type": "boolean",   
"description": "Whether this registration is for an   
individual sending messages personally."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"consent": {   
 "anyOf": \[   
 { 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 42/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "type": "object",   
Pretty-print 

~~"properties": {~~   
 "digitalForm": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"mobileApp": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 43/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM… user through this channel."   
Pretty-print   
 ~~},~~   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"onSite": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"other": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": { 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 44/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "type": "string",   
Pretty-print 

consent channel." 

~~"description": "The app store URL for this~~ 

 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"physicalForm": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"textMessage": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel." 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 45/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print 

~~"screenshotUrl": {~~   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"verbal": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"websiteForm": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 46/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "description": "Whether this consent channel is   
Pretty-print   
~~in use."~~   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"written": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 }   
 } 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 47/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print 

~~{~~   
 "type": "null"   
}   
 \]   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "400": {   
 "description": "Bad Request",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message",   
"docs",   
"title"   
 \],   
"properties": {   
 "message": {   
 "type": "string"   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": {   
 "type": "string",   
"const": "Bad Request"   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 } 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 48/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  }   
Pretty-print   
 ~~},~~   
 "example": {   
 "message": "The input was invalid",   
"docs": "https\://quo.com/docs",   
"title": "Bad Request",   
"trace": "6897907457496870895"   
 }   
 }   
 }   
 },   
 "401": {   
 "description": "Unauthorized",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message",   
"docs",   
"title"   
 \],   
"properties": {   
 "message": {   
 "type": "string"   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": {   
 "type": "string",   
"const": "Unauthorized"   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "Unauthorized", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 49/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "docs": "https\://quo.com/docs",   
Pretty-print 

 }  }  }  },   
~~"title": "Unauthorized",~~ "trace": "6897907457496870895" 

 "402": {   
 "description": "Subscription Expired",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message",   
"docs",   
"title"   
 \],   
"properties": {   
 "message": {   
 "type": "string"   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": {   
 "type": "string",   
"const": "Subscription Expired"   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "This subscription is not able to register for A2P", "docs": "https\://quo.com/docs", 

"title": "Subscription Expired",   
"trace": "6897907457496870895"   
 } 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 50/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  }   
Pretty-print   
 ~~}~~   
 },   
 "403": {   
 "description": "Forbidden",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message",   
"docs",   
"title"   
 \],   
"properties": {   
 "message": {   
 "type": "string"   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": {   
 "type": "string",   
"const": "Forbidden"   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "You must be an organization admin or owner to create an A2P registration", 

 "docs": "https\://quo.com/docs",   
"title": "Forbidden",   
"trace": "6897907457496870895"   
 }   
 }   
 }   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 51/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "404": {   
Pretty-print   
 ~~"description": "Not Found",~~   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message",   
"docs",   
"title"   
 \],   
"properties": {   
 "message": {   
 "type": "string"   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": {   
 "type": "string",   
"const": "Not Found"   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "Not Found",   
"docs": "https\://quo.com/docs",   
"title": "Not Found",   
"trace": "6897907457496870895"   
 }   
 }   
 }   
 },   
 "409": {   
 "description": "Conflict",   
 "content": {   
 "application/json": { 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 52/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "schema": {   
Pretty-print   
 ~~"type": "object",~~   
"required": \[   
 "message",   
"docs",   
"title"   
 \],   
"properties": {   
 "message": {   
 "type": "string"   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": {   
 "type": "string",   
"const": "Conflict"   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "This organization already has an A2P registration", "docs": "https\://quo.com/docs", 

"title": "Conflict",   
"trace": "6897907457496870895"   
 }   
 }   
 }   
 },   
 "422": {   
 "description": "Unprocessable Entity",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 53/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "docs",   
Pretty-print 

~~"title"~~   
 \],   
"properties": {   
 "message": {   
 "type": "string"   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": {   
 "type": "string",   
"const": "Unprocessable Entity"   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "idNumber must contain exactly nine digits for idType USA: Employer Identification Number (EIN)", 

 "docs": "https\://quo.com/docs",   
"title": "Unprocessable Entity",   
"trace": "6897907457496870895"   
 }   
 }   
 }   
 },   
 "500": {   
 "description": "Unexpected Error",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "message",   
"docs",   
"title"   
 \], 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 54/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "properties": {   
Pretty-print   
 ~~"message": {~~   
 "type": "string"   
 },   
"docs": {   
 "type": "string",   
"const": "https\://quo.com/docs"   
 },   
"title": {   
 "type": "string",   
"const": "Unexpected"   
 },   
"trace": {   
 "type": "string"   
 },   
"errors": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "path",   
"message",   
"schema"   
 \],   
"properties": {   
 "path": {   
 "type": "string"   
 },   
"message": {   
 "type": "string"   
 },   
"value": {},   
"schema": {   
 "type": "object",   
"properties": {   
 "type": {   
 "type": "string"   
 }   
 }   
 }   
 }   
 }   
 }   
 }   
 },   
 "example": {   
 "message": "We have encountered an unknown error",   
"docs": "https\://quo.com/docs",   
"title": "Unexpected",   
"trace": "6897907457496870895"   
 }   
 }   
 }   
 }   
 }   
 },   
 "patch": {   
 "tags": \[   
 "A2P Registration"   
 \],   
 "summary": "Update the A2P registration",   
 "description": "Update the organization's A2P (10DLC) draft registration. This is a true merge: a field left out of the request body is left unchanged. Returns 404 if the organization has no registration, and 409 if the registration is no longer a draft.",  "operationId": "updateA2PRegistration", 

 "parameters": \[   
 {   
 "in": "header",   
 "name": "Quo-Api-Version", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 55/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "required": true,   
Pretty-print   
 ~~"schema": {~~   
 "type": "string",   
 "enum": \[   
 "2026-03-30"   
 \],   
 "description": "API version header. Supported values: 2026-03-30"  } 

 }   
 \],   
 "security": \[   
 {   
 "apiKey": \[\]   
 }   
 \],   
 "requestBody": {   
 "required": true,   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
 "properties": {   
 "name": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The legal or registered name of the business.",   
"examples": \[   
 "Acme Inc"   
 \],   
"example": "Acme Inc"   
 },   
"alternateName": {   
 "anyOf": \[   
 {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "An alternate or doing-business-as name for the   
business.",   
 "examples": \[   
 "Acme"   
 \],   
"example": "Acme"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"businessType": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Sole Proprietorship"   
 },   
{   
 "type": "string",   
"const": "Partnership"   
 },   
{   
 "type": "string",   
"const": "Corporation"   
 },   
{   
 "type": "string",   
"const": "Co-operative"   
 },   
{ 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 56/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "type": "string",   
Pretty-print   
~~"const": "Limited Liability Corporation"~~   
 },   
{   
 "type": "string",   
"const": "Non-profit Corporation"   
 }   
 \],   
"description": "The legal structure of the business: one of \`Sole   
Proprietorship\`, \`Partnership\`, \`Corporation\`, \`Co-operative\`, \`Limited Liability Corporation\`, \`Non-profit Corporation\`.", 

 "examples": \[   
 "Limited Liability Corporation"   
 \],   
"example": "Limited Liability Corporation"   
 },   
"companyType": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Private"   
 },   
{   
 "type": "string",   
"const": "Public"   
 },   
{   
 "type": "string",   
"const": "Non-profit"   
 },   
{   
 "type": "string",   
"const": "Government"   
 }   
 \],   
"description": "The type of company. \`ticker\` and \`exchange\` are   
required when this is \`Public\`.",   
 "examples": \[   
 "Private"   
 \],   
"example": "Private"   
 },   
"industry": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Agriculture"   
 },   
{   
 "type": "string",   
"const": "Automotive"   
 },   
{   
 "type": "string",   
"const": "Banking"   
 },   
{   
 "type": "string",   
"const": "Consumer"   
 },   
{   
 "type": "string",   
"const": "Education"   
 },   
{   
 "type": "string",   
"const": "Electronics"   
 },   
{ 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 57/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "type": "string",   
Pretty-print 

~~"const": "Energy"~~   
 },   
{   
 "type": "string",   
"const": "Engineering"   
 },   
{   
 "type": "string",   
"const": "Fast moving consumer goods"   
 },   
{   
 "type": "string",   
"const": "Financial"   
 },   
{   
 "type": "string",   
"const": "Fintech"   
 },   
{   
 "type": "string",   
"const": "Food and beverage"   
 },   
{   
 "type": "string",   
"const": "Government"   
 },   
{   
 "type": "string",   
"const": "Healthcare"   
 },   
{   
 "type": "string",   
"const": "Hospitality"   
 },   
{   
 "type": "string",   
"const": "Insurance"   
 },   
{   
 "type": "string",   
"const": "Jewelry"   
 },   
{   
 "type": "string",   
"const": "Legal"   
 },   
{   
 "type": "string",   
"const": "Manufacturing"   
 },   
{   
 "type": "string",   
"const": "Media"   
 },   
{   
 "type": "string",   
"const": "Not for profit"   
 },   
{   
 "type": "string",   
"const": "Oil and gas"   
 },   
{   
 "type": "string",   
"const": "Online"   
 },   
{   
 "type": "string", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 58/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "const": "Raw materials"   
Pretty-print   
 ~~},~~   
{   
 "type": "string",   
"const": "Real estate"   
 },   
{   
 "type": "string",   
"const": "Religion"   
 },   
{   
 "type": "string",   
"const": "Retail"   
 },   
{   
 "type": "string",   
"const": "Technology"   
 },   
{   
 "type": "string",   
"const": "Telecommunications"   
 },   
{   
 "type": "string",   
"const": "Transportation"   
 },   
{   
 "type": "string",   
"const": "Travel"   
 }   
 \],   
"description": "The industry the business operates in: one of   
\`Agriculture\`, \`Automotive\`, \`Banking\`, \`Consumer\`, \`Education\`, \`Electronics\`, \`Energy\`, \`Engineering\`, \`Fast moving consumer goods\`, \`Financial\`, \`Fintech\`, \`Food and beverage\`, \`Government\`, \`Healthcare\`, \`Hospitality\`, \`Insurance\`, \`Jewelry\`, \`Legal\`, \`Manufacturing\`, \`Media\`, \`Not for profit\`, \`Oil and gas\`, \`Online\`, \`Raw materials\`, \`Real estate\`, \`Religion\`, \`Retail\`, \`Technology\`, \`Telecommunications\`, \`Transportation\`, \`Travel\`.", 

 "examples": \[   
 "Technology"   
 \],   
"example": "Technology"   
 },   
"employeeCount": {   
 "type": "integer",   
"minimum": 1,   
"description": "The number of employees at the business.",   
"examples": \[   
 25   
 \],   
"example": 25   
 },   
"avgDailyCallVolume": {   
 "type": "integer",   
"minimum": 1,   
"description": "The business's average daily call volume.",   
"examples": \[   
 100   
 \],   
"example": 100   
 },   
"regionsOfOperation": {   
 "type": "array",   
"items": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Africa"   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 59/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  {   
Pretty-print   
 ~~"type": "string",~~   
"const": "Asia"   
 },   
{   
 "type": "string",   
"const": "Europe"   
 },   
{   
 "type": "string",   
"const": "Latin America"   
 },   
{   
 "type": "string",   
"const": "USA and Canada"   
 }   
 \]   
 },   
"minItems": 1,   
"maxItems": 5,   
"uniqueItems": true,   
"description": "The regions the business operates in. Each entry is one of \`Africa\`, \`Asia\`, \`Europe\`, \`Latin America\`, \`USA and Canada\`.", 

 "examples": \[   
 \[   
 "USA and Canada"   
 \]   
 \],   
"example": \[   
 "USA and Canada"   
 \]   
 },   
"websiteUrl": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"format": "uri",   
"description": "The business's website URL.",   
"examples": \[   
 "https\://acme.example"   
 \],   
"example": "https\://acme.example"   
 },   
"idType": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "USA: Employer Identification Number (EIN)"   
 },   
{   
 "type": "string",   
"const": "Canada: Canadian Business Number (BN-9)"   
 },   
{   
 "type": "string",   
"const": "Great Britain: Company Number"   
 },   
{   
 "type": "string",   
"const": "Australia: Company Number from ASIC (ACN)"   
 },   
{   
 "type": "string",   
"const": "India: Corporate Identity Number"   
 },   
{   
 "type": "string",   
"const": "Estonia: VAT Number"   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 60/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  {   
Pretty-print   
 ~~"type": "string",~~   
"const": "Romania: VAT Registration Number"   
 },   
{   
 "type": "string",   
"const": "Israel: Registration Number"   
 },   
{   
 "type": "string",   
"const": "Other"   
 }   
 \],   
"description": "The type of the business's government-issued tax ID:   
one of \`USA: Employer Identification Number (EIN)\`, \`Canada: Canadian Business Number (BN 9)\`, \`Great Britain: Company Number\`, \`Australia: Company Number from ASIC (ACN)\`, \`India: Corporate Identity Number\`, \`Estonia: VAT Number\`, \`Romania: VAT Registration Number\`, \`Israel: Registration Number\`, \`Other\`.", 

 "examples": \[   
 "USA: Employer Identification Number (EIN)"   
 \],   
"example": "USA: Employer Identification Number (EIN)"   
 },   
"idNumber": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The business's government-issued tax ID number. An EIN   
must carry exactly nine digits, and separators such as the dash in \`12-3456789\` are ignored. A Canadian BN-9 must be exactly nine digits with no separators.",  "examples": \[ 

 "12-3456789"   
 \],   
"example": "12-3456789"   
 },   
"ticker": {   
 "anyOf": \[   
 {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The business's stock ticker symbol. Required when   
\`companyType\` is \`Public\`.",   
 "examples": \[   
 "ACME"   
 \],   
"example": "ACME"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"exchange": {   
 "anyOf": \[   
 {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "NASDAQ"   
 },   
{   
 "type": "string",   
"const": "NYSE"   
 },   
{   
 "type": "string",   
"const": "AMEX"   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 61/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  {   
Pretty-print   
 ~~"type": "string",~~   
"const": "AMX"   
 },   
{   
 "type": "string",   
"const": "ASX"   
 },   
{   
 "type": "string",   
"const": "B3"   
 },   
{   
 "type": "string",   
"const": "BME"   
 },   
{   
 "type": "string",   
"const": "BSE"   
 },   
{   
 "type": "string",   
"const": "FRA"   
 },   
{   
 "type": "string",   
"const": "ICEX"   
 },   
{   
 "type": "string",   
"const": "JPX"   
 },   
{   
 "type": "string",   
"const": "JSE"   
 },   
{   
 "type": "string",   
"const": "KRX"   
 },   
{   
 "type": "string",   
"const": "LON"   
 },   
{   
 "type": "string",   
"const": "NSE"   
 },   
{   
 "type": "string",   
"const": "OMX"   
 },   
{   
 "type": "string",   
"const": "SEHK"   
 },   
{   
 "type": "string",   
"const": "SGX"   
 },   
{   
 "type": "string",   
"const": "SSE"   
 },   
{   
 "type": "string",   
"const": "STO"   
 },   
{ 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 62/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "type": "string",   
Pretty-print 

~~"const": "SWX"~~   
 },   
{   
 "type": "string",   
"const": "SZSE"   
 },   
{   
 "type": "string",   
"const": "TSX"   
 },   
{   
 "type": "string",   
"const": "TWSE"   
 },   
{   
 "type": "string",   
"const": "VSE"   
 },   
{   
 "type": "string",   
"const": "Other"   
 }   
 \],   
"description": "The stock exchange the business's ticker is listed   
on. Required when \`companyType\` is \`Public\`. One of \`NASDAQ\`, \`NYSE\`, \`AMEX\`, \`AMX\`, \`ASX\`, \`B3\`, \`BME\`, \`BSE\`, \`FRA\`, \`ICEX\`, \`JPX\`, \`JSE\`, \`KRX\`, \`LON\`, \`NSE\`, \`OMX\`, \`SEHK\`, \`SGX\`, \`SSE\`, \`STO\`, \`SWX\`, \`SZSE\`, \`TSX\`, \`TWSE\`, \`VSE\`, \`Other\`.", 

 "examples": \[   
 "NASDAQ"   
 \],   
"example": "NASDAQ"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"address": {   
 "type": "object",   
"properties": {   
 "line1": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The first line of the business's registered   
address.",   
 "examples": \[   
 "1 Main St"   
 \],   
"example": "1 Main St"   
 },   
"line2": {   
 "anyOf": \[   
 {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The second line of the business's registered   
address.",   
 "examples": \[   
 "Suite 200"   
 \],   
"example": "Suite 200"   
 },   
{   
 "type": "null"   
 }   
 \] 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 63/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print 

~~"city": {~~   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The city of the business's registered address.",   
"examples": \[   
 "San Francisco"   
 \],   
"example": "San Francisco"   
 },   
"region": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The state or region of the business's registered   
address.",   
 "examples": \[   
 "CA"   
 \],   
"example": "CA"   
 },   
"postalCode": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The postal code of the business's registered   
address.",   
 "examples": \[   
 "94110"   
 \],   
"example": "94110"   
 },   
"country": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The country of the business's registered address.",   
"examples": \[   
 "US"   
 \],   
"example": "US"   
 }   
 }   
 },   
"personOfContact": {   
 "type": "object",   
"properties": {   
 "firstName": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The first name of the business contact submitting   
this registration.",   
 "examples": \[   
 "Ada"   
 \],   
"example": "Ada"   
 },   
"lastName": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The last name of the business contact submitting   
this registration.",   
 "examples": \[   
 "Lovelace"   
 \],   
"example": "Lovelace" 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 64/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print 

~~"jobTitle": {~~   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"description": "The job title of the business contact submitting   
this registration.",   
 "examples": \[   
 "CTO"   
 \],   
"example": "CTO"   
 },   
"jobPosition": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Other"   
 },   
{   
 "type": "string",   
"const": "Director"   
 },   
{   
 "type": "string",   
"const": "GM"   
 },   
{   
 "type": "string",   
"const": "VP"   
 },   
{   
 "type": "string",   
"const": "CEO"   
 },   
{   
 "type": "string",   
"const": "CFO"   
 },   
{   
 "type": "string",   
"const": "General Counsel"   
 }   
 \],   
"description": "The job position of the business contact submitting   
this registration: one of \`Other\`, \`Director\`, \`GM\`, \`VP\`, \`CEO\`, \`CFO\`, \`General Counsel\`.", 

 "examples": \[   
 "Director"   
 \],   
"example": "Director"   
 },   
"email": {   
 "type": "string",   
"minLength": 1,   
"maxLength": 255,   
"format": "email",   
"description": "The business contact's email address.",   
"examples": \[   
 "ada@acme.example"   
 \],   
"example": "ada@acme.example"   
 },   
"phoneNumber": {   
 "type": "string",   
"maxLength": 255,   
"pattern": "^\\\\+\[1-9\]\\\\d{1,14}\$",   
"description": "The business contact's phone number, in E.164   
format.",   
 "examples": \[ 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 65/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "+15551234567"   
Pretty-print   
 ~~\],~~   
"example": "+15551234567"   
 }   
 }   
 },   
"messageTypes": {   
 "type": "array",   
"items": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "appointments\_scheduling"   
 },   
{   
 "type": "string",   
"const": "transactional\_notifications"   
 },   
{   
 "type": "string",   
"const": "customer\_support"   
 },   
{   
 "type": "string",   
"const": "verification\_security"   
 },   
{   
 "type": "string",   
"const": "promotions\_announcements"   
 }   
 \]   
 },   
"minItems": 1,   
"description": "The message-use types that autofill uses for this   
request. Required when the request includes \`name\`, \`alternateName\`, \`businessType\`, \`websiteUrl\`, \`personOfContact.firstName\` or \`personOfContact.lastName\`, because those fields start autofill. Ignored when the request includes none of them. To run autofill again, send one of them again with its current value. The registration does not store this value.", 

 "examples": \[   
 \[   
 "customer\_support",   
"transactional\_notifications"   
 \]   
 \],   
"example": \[   
 "customer\_support",   
"transactional\_notifications"   
 \]   
 }   
 }   
 }   
 }   
 }   
 },   
 "responses": {   
 "200": {   
 "description": "OK",   
 "content": {   
 "application/json": {   
 "schema": {   
 "type": "object",   
"required": \[   
 "data"   
 \],   
"properties": {   
 "data": {   
 "type": "object",   
"required": \[ 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 66/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "id",   
Pretty-print 

~~"draft",~~   
"status",   
"statusMessages", "autofillStatus", "type", 

"assignedPnId", "firstSubmittedAt", "createdAt", 

"updatedAt",   
"businessInfo", "messaging" 

 \],   
"properties": {   
 "id": {   
 "description": "The unique identifier of the A2P registration.", "examples": \[ 

 "RG123abc"   
 \],   
"example": "RG123abc",   
"type": "string",   
"pattern": "^RG(.\*)\$"   
 },   
"draft": {   
 "type": "boolean",   
"description": "True if the registration has not yet been   
submitted for carrier approval. Combine with \`status\` to tell submission states apart: \`draft: true, status: \\"pending\\"\` means not yet submitted; \`draft: false, status: \\"pending\\"\` means submitted and awaiting carrier approval." 

 },   
"status": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "pending"   
 },   
{   
 "type": "string",   
"const": "approved"   
 },   
{   
 "type": "string",   
"const": "rejected"   
 },   
{   
 "type": "string",   
"const": "failed"   
 }   
 \],   
"description": "The registration's overall status. \`pending\` is   
set both at creation and while awaiting carrier approval after submission — check \`draft\` to tell those two apart. \`rejected\` and \`failed\` both mean the registration must be resubmitted, which re-triggers billing.", 

 "examples": \[   
 "pending"   
 \],   
"example": "pending"   
 },   
"statusMessages": {   
 "type": "array",   
"items": {   
 "type": "object",   
"required": \[   
 "errorCode",   
"errorReason"   
 \],   
"properties": {   
 "errorCode": {   
 "type": "number", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 67/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "description": "The carrier error code associated with this   
Pretty-print   
~~status message."~~   
 },   
"errorReason": {   
 "type": "string",   
"description": "A human-readable explanation of the   
status."   
 },   
"fieldName": {   
 "type": "string",   
"description": "The single business-profile field this   
message refers to, if any."   
 },   
"fields": {   
 "type": "array",   
"items": {   
 "type": "string"   
},   
"description": "The business-profile fields this message   
refers to, if any."   
 }   
 }   
 },   
"description": "Carrier-reported reasons for the current status,   
most relevant when \`status\` is \`rejected\` or \`failed\`."   
 },   
"autofillStatus": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "pending"   
 },   
{   
 "type": "string",   
"const": "in-progress"   
 },   
{   
 "type": "string",   
"const": "completed"   
 },   
{   
 "type": "string",   
"const": "failed"   
 }   
 \],   
"description": "Status of the automatic field-fill for this   
registration. \`completed\` means the messaging fields are generated and the registration can be submitted; \`pending\` or \`in-progress\` means submission is not yet allowed; \`failed\` means autofill did not complete and the registration must be updated and retried.",  "examples": \[ 

 "completed"   
 \],   
"example": "completed"   
 },   
"type": {   
 "anyOf": \[   
 {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "standard"   
 },   
{   
 "type": "string",   
"const": "lv-standard"   
 },   
{   
 "type": "string",   
"const": "starter" 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 68/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print 

~~{~~   
 "type": "string",   
"const": "sole-prop"   
 }   
 \],   
"description": "The type of A2P registration.",   
"examples": \[   
 "standard"   
 \],   
"example": "standard"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"assignedPnId": {   
 "anyOf": \[   
 {   
 "type": "string",   
"pattern": "^PN(.\*)\$"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"firstSubmittedAt": {   
 "anyOf": \[   
 {   
 "description": "The timestamp the registration was first submitted for carrier approval.", 

 "type": "string",   
"format": "date-time"   
 },   
{   
 "type": "null"   
 }   
 \]   
 },   
"createdAt": {   
 "description": "The timestamp the registration was created.", "type": "string", 

"format": "date-time"   
 },   
"updatedAt": {   
 "description": "The timestamp the registration was last updated.", 

 "type": "string",   
"format": "date-time"   
 },   
"businessInfo": {   
 "type": "object",   
"required": \[   
 "name",   
"alternateName",   
"businessType",   
"companyType",   
"industry",   
"employeeCount",   
"avgDailyCallVolume",   
"regionsOfOperation",   
"websiteUrl",   
"idType",   
"idNumber",   
"ticker",   
"exchange",   
"address", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 69/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "personOfContact"   
Pretty-print   
 ~~\],~~   
"properties": {   
 "name": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The legal or registered name of the   
business.",   
"examples": \[   
 "Acme Inc"   
\],   
"example": "Acme Inc"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"alternateName": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "An alternate or doing-business-as name   
for the business."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"businessType": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The legal structure of the business.",   
"examples": \[   
 "Limited Liability Corporation"   
\],   
"example": "Limited Liability Corporation"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"companyType": {   
 "anyOf": \[   
 {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Private"   
 },   
{   
 "type": "string",   
"const": "Public"   
 },   
{   
 "type": "string",   
"const": "Non-profit"   
 },   
{   
 "type": "string",   
"const": "Government"   
 }   
 \],   
"description": "The type of company: one of \`Private\`,   
\`Public\`, \`Non-profit\`, \`Government\`.", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 70/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "examples": \[   
Pretty-print   
 ~~"Private"~~   
\],   
"example": "Private"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"industry": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The industry the business operates in."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"employeeCount": {   
 "anyOf": \[   
 {   
 "type": "number",   
"description": "The number of employees at the business."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"avgDailyCallVolume": {   
 "anyOf": \[   
 {   
 "type": "number",   
"description": "The business's average daily call   
volume."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"regionsOfOperation": {   
 "type": "array",   
"items": {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Africa"   
 },   
{   
 "type": "string",   
"const": "Asia"   
 },   
{   
 "type": "string",   
"const": "Europe"   
 },   
{   
 "type": "string",   
"const": "Latin America"   
 },   
{   
 "type": "string",   
"const": "USA and Canada"   
 }   
 \] 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 71/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print   
~~"description": "The regions the business operates in. Each~~   
entry is one of \`Africa\`, \`Asia\`, \`Europe\`, \`Latin America\`, \`USA and Canada\`."  }, 

"websiteUrl": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business's website URL.",   
"format": "uri"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"idType": {   
 "anyOf": \[   
 {   
 "anyOf": \[   
 {   
 "type": "string",   
"const": "Australia: Company Number from ASIC (ACN)"   
 },   
{   
 "type": "string",   
"const": "Canada: Business Number (BIN)"   
 },   
{   
 "type": "string",   
"const": "Canada: Canadian Business Number (BN-9)"   
 },   
{   
 "type": "string",   
"const": "Canada: Canadian Corporation Number (CCN)"   
 },   
{   
 "type": "string",   
"const": "Estonia: VAT Number"   
 },   
{   
 "type": "string",   
"const": "Great Britain: Company Number"   
 },   
{   
 "type": "string",   
"const": "India: Corporate Identity Number"   
 },   
{   
 "type": "string",   
"const": "Israel: Registration Number"   
 },   
{   
 "type": "string",   
"const": "Romania: VAT Registration Number"   
 },   
{   
 "type": "string",   
"const": "USA: DUNS Number (Dun & Bradstreet)"   
 },   
{   
 "type": "string",   
"const": "USA: Employer Identification Number (EIN)"   
 },   
{   
 "type": "string",   
"const": "Other"   
 }   
 \], 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 72/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "description": "The type of the business's government   
Pretty-print   
~~issued tax ID: one of \`Australia: Company Number from ASIC (ACN)\`, \`Canada: Business Number~~ (BIN)\`, \`Canada: Canadian Business Number (BN-9)\`, \`Canada: Canadian Corporation Number (CCN)\`, \`Estonia: VAT Number\`, \`Great Britain: Company Number\`, \`India: Corporate Identity Number\`, \`Israel: Registration Number\`, \`Romania: VAT Registration Number\`, \`USA: DUNS Number (Dun & Bradstreet)\`, \`USA: Employer Identification Number (EIN)\`, \`Other\`.",  "examples": \[ 

 "USA: Employer Identification Number (EIN)" \], 

"example": "USA: Employer Identification Number (EIN)"   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"idNumber": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business's government-issued tax ID   
number."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"ticker": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business's stock ticker symbol, if   
publicly traded."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"exchange": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The stock exchange the business's ticker   
is listed on, if publicly traded."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"address": {   
 "type": "object",   
"required": \[   
 "line1",   
"line2",   
"city",   
"region",   
"postalCode",   
"country"   
 \],   
"properties": {   
 "line1": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The first line of the business's   
registered address." 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 73/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print 

~~{~~   
 "type": "null"   
}   
 \]   
 },   
"line2": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The second line of the business's   
registered address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"city": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The city of the business's registered   
address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"region": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The state or region of the business's   
registered address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"postalCode": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The postal code of the business's   
registered address."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"country": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The country of the business's   
registered address.",   
"examples": \[   
 "US"   
\],   
"example": "US"   
 },   
{   
 "type": "null"   
}   
 \] 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 74/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  }   
Pretty-print   
 ~~}~~   
 },   
"personOfContact": {   
 "type": "object",   
"required": \[   
 "firstName",   
"lastName",   
"jobTitle",   
"jobPosition",   
"email",   
"phoneNumber"   
 \],   
"properties": {   
 "firstName": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The first name of the business   
contact submitting this registration."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"lastName": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The last name of the business contact   
submitting this registration."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"jobTitle": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The job title of the business contact   
submitting this registration."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"jobPosition": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The job position of the business   
contact submitting this registration."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"email": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business contact's email   
address.",   
"format": "email" 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 75/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  },   
Pretty-print 

~~{~~   
 "type": "null"   
}   
 \]   
 },   
"phoneNumber": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The business contact's phone number."   
 },   
{   
 "type": "null"   
}   
 \]   
 }   
 }   
 }   
 }   
 },   
"messaging": {   
 "type": "object",   
"required": \[   
 "useCase",   
"personalUse",   
"consent"   
 \],   
"properties": {   
 "useCase": {   
 "anyOf": \[   
 {   
 "type": "string",   
"description": "The messaging use case this registration   
was created for."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"personalUse": {   
 "anyOf": \[   
 {   
 "type": "boolean",   
"description": "Whether this registration is for an   
individual sending messages personally."   
 },   
{   
 "type": "null"   
}   
 \]   
 },   
"consent": {   
 "anyOf": \[   
 {   
 "type": "object",   
"properties": {   
 "digitalForm": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 76/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "askForConsentExample": {   
Pretty-print   
 ~~"type": "string",~~   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"mobileApp": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"onSite": {   
 "type": "object",   
"required": \[   
 "enabled" 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 77/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  \],   
Pretty-print 

~~"properties": {~~   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"other": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel." 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 78/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  }   
Pretty-print   
 ~~}~~   
 },   
"physicalForm": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"textMessage": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string", 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 79/681  
11/12/26, 1:05 PM cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguM…  "description": "The consent text shown to the end   
Pretty-print   
~~user through this channel."~~   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"verbal": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 },   
"storeUrl": {   
 "type": "string",   
"description": "The app store URL for this   
consent channel."   
 },   
"text": {   
 "type": "string",   
"description": "The consent text shown to the end   
user through this channel."   
 },   
"url": {   
 "type": "string",   
"description": "A URL demonstrating or hosting   
this consent channel."   
 }   
 }   
 },   
"websiteForm": {   
 "type": "object",   
"required": \[   
 "enabled"   
\],   
"properties": {   
 "enabled": {   
 "type": "boolean",   
"description": "Whether this consent channel is   
in use."   
 },   
"askForConsentExample": {   
 "type": "string",   
"description": "An example of how consent is   
requested through this channel."   
 },   
"screenshotUrl": {   
 "type": "string",   
"description": "A screenshot demonstrating this   
consent channel."   
 }, 

https\://cdn.quo.com/public-api/openphone-public-api-2026-03-30-prod.json?\_gl=1\*tge1vs\*\_gcl\_au\*MjY5MzUyMjguMTc5MTQ… 80/681