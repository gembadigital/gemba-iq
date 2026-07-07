import * as XLSX from "xlsx";
import { Recipient } from "../types";

/**
 * Normalizes keys to match Recipient properties using fuzzy header matching
 */
function normalizeHeaders(rawRow: any): Partial<Recipient> {
  const normalized: Partial<Recipient> = {
    FirstName: "",
    LastName: "",
    Company: "",
    Email: "",
    Department: "",
    Address: "",
    Industry: "",
    ScheduledDate: "",
    CustomField1: "",
    CustomField2: "",
    CustomField3: ""
  };

  const keyMap: { [key: string]: keyof typeof normalized } = {
    firstname: "FirstName",
    "first name": "FirstName",
    fname: "FirstName",
    first: "FirstName",
    
    lastname: "LastName",
    "last name": "LastName",
    lname: "LastName",
    last: "LastName",
    
    company: "Company",
    organization: "Company",
    org: "Company",
    
    email: "Email",
    "email address": "Email",
    emailaddress: "Email",
    mail: "Email",
    receiver: "Email",
    
    department: "Department",
    dept: "Department",
    division: "Department",

    address: "Address",
    location: "Address",
    street: "Address",
    city: "Address",

    industry: "Industry",
    sector: "Industry",
    field: "Industry",

    scheduleddate: "ScheduledDate",
    "scheduled date": "ScheduledDate",
    senddate: "ScheduledDate",
    "send date": "ScheduledDate",
    scheduled: "ScheduledDate",
    "scheduled send date": "ScheduledDate",
    plan: "ScheduledDate",
    "planned date": "ScheduledDate",
    
    customfield1: "CustomField1",
    custom1: "CustomField1",
    custom_field_1: "CustomField1",
    
    customfield2: "CustomField2",
    custom2: "CustomField2",
    custom_field_2: "CustomField2",
    
    customfield3: "CustomField3",
    custom3: "CustomField3",
    custom_field_3: "CustomField3"
  };

  // Default fallback assignment
  const entries = Object.entries(rawRow);
  for (const [rawKey, val] of entries) {
    const cleanKey = rawKey.toLowerCase().trim().replace(/[\s_-]+/g, " ");
    const mappedProperty = keyMap[cleanKey] || keyMap[rawKey.toLowerCase().trim()];
    
    if (mappedProperty) {
      (normalized as any)[mappedProperty] = String(val || "").trim();
    } else {
      // If we cannot find a clean match, attempt substring match
      if (cleanKey.includes("first")) normalized.FirstName = String(val || "").trim();
      else if (cleanKey.includes("last")) normalized.LastName = String(val || "").trim();
      else if (cleanKey.includes("email") || cleanKey.includes("mail")) normalized.Email = String(val || "").trim();
      else if (cleanKey.includes("company")) normalized.Company = String(val || "").trim();
      else if (cleanKey.includes("dept") || cleanKey.includes("department")) normalized.Department = String(val || "").trim();
      else if (cleanKey.includes("address") || cleanKey.includes("city") || cleanKey.includes("location") || cleanKey.includes("adres")) normalized.Address = String(val || "").trim();
      else if (cleanKey.includes("industry") || cleanKey.includes("sector") || cleanKey.includes("endustri")) normalized.Industry = String(val || "").trim();
      else if (cleanKey.includes("schedule") || cleanKey.includes("plan") || cleanKey.includes("send date") || cleanKey.includes("tarih")) normalized.ScheduledDate = String(val || "").trim();
      else if (cleanKey.includes("custom1") || cleanKey.includes("field1")) normalized.CustomField1 = String(val || "").trim();
      else if (cleanKey.includes("custom2") || cleanKey.includes("field2")) normalized.CustomField2 = String(val || "").trim();
      else if (cleanKey.includes("custom3") || cleanKey.includes("field3")) normalized.CustomField3 = String(val || "").trim();
    }
  }

  return normalized;
}

/**
 * Handles FileReader parsing of .xlsx or .csv files and outputs standard Recipient arrays
 */
export function parseSpreadsheet(file: File): Promise<Recipient[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("No data retrieved from file reading session.");
        }
        
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of raw row objects
        const rawRows = XLSX.utils.sheet_to_json(worksheet);
        
        if (rawRows.length === 0) {
          throw new Error("The selected sheet does not contain any readable row records.");
        }

        const recipientsItems: Recipient[] = rawRows.map((row: any, index): Recipient => {
          const mapped = normalizeHeaders(row);
          return {
            id: `rec_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
            FirstName: mapped.FirstName || "",
            LastName: mapped.LastName || "",
            Company: mapped.Company || "",
            Email: mapped.Email || "",
            Department: mapped.Department || "",
            Address: mapped.Address || "",
            Industry: mapped.Industry || "",
            ScheduledDate: mapped.ScheduledDate || "",
            CustomField1: mapped.CustomField1 || "",
            CustomField2: mapped.CustomField2 || "",
            CustomField3: mapped.CustomField3 || "",
            status: "idle",
            openCount: 0,
            isSelected: true
          };
        });

        // Filter out records without an email address to keep the batch clean
        const recipients = recipientsItems.filter((rec) => rec.Email && rec.Email.trim() !== "");

        if (recipients.length === 0) {
          throw new Error("The spreadsheet does not contain any records with valid email addresses.");
        }

        resolve(recipients);
      } catch (err: any) {
        reject(new Error(`Failed parsing spreadsheet: ${err.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("File uploading / loading error transpired. Check file integrity."));
    };

    reader.readAsArrayBuffer(file);
  });
}
