import {
    $query,
    $update,
    Record,
    StableBTreeMap,
    Result,
    nat64,
    ic,
    match,
    Variant,
    Vec,
    Opt,
    text,
  } from "azle";
  import { v4 as uuidv4 } from "uuid";
  
  // Define the Patient type
  type Patient = Record<{
    id: string;
    name: string;
    age: nat64;
    gender: string;
    bloodType: string;
    medicalHistory: string;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
  }>;
  
  // Define the PatientPayload type for creating or updating patients
  type PatientPayload = Record<{
    name: string;
    age: nat64;
    gender: string;
    bloodType: string;
    medicalHistory: string;
  }>;
  
  // Define the Error type
  type Error = Variant<{
    NotFound: string;
    InvalidPayload: string;
  }>;
  
  // Create StableBTreeMap to store patients
  const patientsStorage = new StableBTreeMap<string, Patient>(0, 44, 1024);
  
  // Function to add patients in the storage
  $update;
  export function addPatient(payload: PatientPayload): Result<Patient, Error> {
    try {
      // Payload Validation
      if (!payload.name || !payload.age || !payload.gender || !payload.bloodType || !payload.medicalHistory) {
        return Result.Err({ InvalidPayload: "Invalid patient payload" });
      }

      // Validate age
      if (payload.age <= 0) {
        return Result.Err({ InvalidPayload: "Invalid age" });
      }

      // Validate gender
      if (payload.gender !== "male" && payload.gender !== "female") {
        return Result.Err({ InvalidPayload: "Invalid gender" });
      }

      // Validate blood type
      if (payload.bloodType !== "A" && payload.bloodType !== "B" && payload.bloodType !== "AB" && payload.bloodType !== "O") {
        return Result.Err({ InvalidPayload: "Invalid blood type" });
      }

      // Validate medical history
      if (payload.medicalHistory.length > 1000) {
        return Result.Err({ InvalidPayload: "Invalid medical history" });
      }

      // Generate UUID, create and update time, and add the payload
      const patient: Patient = {
        id: uuidv4(),
        createdAt: ic.time(),
        updatedAt: Opt.None,
        name: payload.name,
        age: payload.age,
        gender: payload.gender,
        bloodType: payload.bloodType,
        medicalHistory: payload.medicalHistory
    
      };

      // Insert the patient
      patientsStorage.insert(patient.id, patient);

      // Return an OK with the patient you saved
      return Result.Ok(patient);
    } catch (error) {
      return Result.Err({ InvalidPayload: `Failed to add patient: ${error}` });
    }
  }
  
  $query;
  // Function to get all patients from the storage
  export function getPatients(): Result<Vec<Patient>, Error> {
    try {
      // Return all patients
      return Result.Ok(patientsStorage.values());
    } catch (error) {
      return Result.Err({ NotFound: `Failed to get patients: ${error}` });
    }
  }
  
  $query;
  // Function to get a specific patient from the patients storage using the UUID
  export function getPatient(id: string): Result<Patient, Error> {
    try {
      // ID Validation
      if (!id || typeof id !== "string") {
        return Result.Err({ NotFound: "Invalid patient ID" });
      }
  
      const existingPatientOpt = patientsStorage.get(id);
  
      return match(existingPatientOpt, {
        Some: (patient) => Result.Ok<Patient, Error>(patient),
        None: () => Result.Err<Patient, Error>({ NotFound: `The patient with ID ${id} not found` }),
      });
    } catch (error) {
      return Result.Err({ NotFound: `Failed to get patient: ${error}` });
    }
  }
  
  $update;
  // Function to update a patient already in the patientsStorage using the UUID
  export function updatePatient(id: string, payload: PatientPayload): Result<Patient, Error> {
    try {
      // ID Validation
      if (!id || typeof id !== "string") {
        return Result.Err({ NotFound: "Invalid patient ID" });
      }
  
      // Payload Validation
      if (!payload.name || !payload.age || !payload.gender || !payload.bloodType || !payload.medicalHistory) {
        return Result.Err({ InvalidPayload: "Invalid patient payload" });
      }
  
      const existingPatientOpt = patientsStorage.get(id);
  
      return match(existingPatientOpt, {
        Some: (existingPatient) => {
          const updatedPatient: Patient = {
            ...existingPatient,
            ...payload,
            updatedAt: Opt.Some(ic.time()),
          };
  
          patientsStorage.insert(id, updatedPatient);
          return Result.Ok<Patient, Error>(updatedPatient);
        },
        None: () => Result.Err<Patient, Error>({ NotFound: `Couldn't update a patient with ID ${id}. Patient not found` }),
      });
    } catch (error) {
      return Result.Err({ InvalidPayload: `Failed to update patient: ${error}` });
    }
  }
  
  $update;
  // Function to delete a patient from the patientsStorage using the UUID
  export function deletePatient(id: string): Result<Patient, Error> {
    try {
      // ID Validation
      if (!id || typeof id !== "string") {
        return Result.Err({ NotFound: "Invalid patient ID" });
      }
  
      const deletedPatientOpt = patientsStorage.remove(id);
  
      return match(deletedPatientOpt, {
        Some: (deletedPatient) => Result.Ok<Patient, Error>(deletedPatient),
        None: () => Result.Err<Patient, Error>({ NotFound: `Couldn't delete a patient with ID ${id}. Patient not found` }),
      });
    } catch (error) {
      return Result.Err({ NotFound: `Failed to delete patient: ${error}` });
    }
  }
  
  // A workaround to make the uuid package work with Azle
  globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
      let array = new Uint8Array(32);
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  };
  