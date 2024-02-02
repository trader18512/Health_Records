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

// Define types

type PatientID = string;
type DoctorID = string;
type UniqueNumber = string;
type HealthRecordID = string;
type PrescriptionID = string;
type LabTestID = string;

type DateTime = number; // Assuming it's stored as a timestamp

// type Record<T> = {
//   [K in keyof T]: T[K];
// };

// type Opt<T> = T | null;

// Define Patient record

type Patient = Record<{
  id: PatientID;
  name: string;
  age: number; // Assuming nat64 is a 64-bit unsigned integer
  gender: string;
  bloodType: string;
  medicalHistory: string;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

// Define Health Record

type HealthRecord = Record<{
  id: HealthRecordID;
  patientID: PatientID;
  uniqueNumber: UniqueNumber;
  officerID: DoctorID;
  diagnosisNotes: string;
  labTestIDs: Opt<Vec<string>>;
  prescriptionIDs: Vec<PrescriptionID>;
  createdAt: nat64;
}>;

// Define Doctor

type Doctor = Record<{
  id: DoctorID;
  name: string;
  specialization: string;
  createdAt: nat64;
}>;

// Define Prescription

type Prescription = Record<{
  id: PrescriptionID;
  doctorID: DoctorID;
  patientID: PatientID;
  medication: string;
  dosage: string;
  createdAt: nat64;
}>;

// Define Lab Test

type LabTest = Record<{
  id: LabTestID;
  patientID: PatientID;
  doctorID: DoctorID;
  testType: string;
  results: string;
  createdAt: nat64;
}>;


// Define the Error type
type Error = Variant<{
  NotFound: string;
  InvalidPayload: string;
}>;

// Create StableBTreeMap to store patients
const patientsStorage = new StableBTreeMap<string, Patient>(0, 44, 1024);
const healthRecordsStorage = new StableBTreeMap<string, HealthRecord>(0, 44, 1024);
const doctorsStorage = new StableBTreeMap<string, Doctor>(0, 44, 1024);
const prescriptionsStorage = new StableBTreeMap<string, Prescription>(0, 44, 1024);
const labTestsStorage = new StableBTreeMap<string, LabTest>(0, 44, 1024);

// Function to add patients in the storage
$update;
export function addPatient(payload: Patient): Result<Patient, Error> {
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
      ...payload,
      id: uuidv4(),
      createdAt: ic.time(),
      updatedAt: Opt.None,
    };

    // Insert the patient
    patientsStorage.insert(patient.id, patient);

    // Return an OK with the patient you saved
    return Result.Ok(patient);
  } catch (error) {
    return Result.Err({ InvalidPayload: `Failed to add patient: ${error}` });
  }
}

// Function to get all patients from the storage
$query;
export function getPatients(): Result<Vec<Patient>, Error> {
  try {
    // Return all patients
    return Result.Ok(patientsStorage.values());
  } catch (error) {
    return Result.Err({ NotFound: `Failed to get patients: ${error}` });
  }
}

// Function to get a specific patient from the patients storage using the UUID
$query;
export function getPatient(id: PatientID): Result<Patient, Error> {
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

// Function to update a patient already in the patientsStorage using the UUID
$update;
export function updatePatient(id: PatientID, payload: Patient): Result<Patient, Error> {
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

// Function to delete a patient from the patientsStorage using the UUID
$update;
export function deletePatient(id: PatientID): Result<Patient, Error> {
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

// Function to add health record
$update;
export function addHealthRecord(payload: HealthRecord): Result<HealthRecord, Error> {
  try {
    // Payload Validation
    if (!payload.patientID || !payload.officerID || !payload.diagnosisNotes) {
      return Result.Err({ InvalidPayload: "Invalid health record payload" });
    }

    // Validate patient existence
    const existingPatientOpt = patientsStorage.get(payload.patientID);
    if (!existingPatientOpt) {
      return Result.Err({ NotFound: `Patient with ID ${payload.patientID} not found` });
    }

    // Generate UUID, create time, and add the payload
    const healthRecord: HealthRecord = {
      ...payload,
      id: uuidv4(),
      createdAt: ic.time(),
      labTestIDs: Opt.None,
      prescriptionIDs: [],
    };

    // Insert the health record
    healthRecordsStorage.insert(healthRecord.id, healthRecord);

    // Return an OK with the health record you saved
    return Result.Ok(healthRecord);
  } catch (error) {
    return Result.Err({ InvalidPayload: `Failed to add health record: ${error}` });
  }
}

// Function to get all health records
$query;
export function getHealthRecords(): Result<Vec<HealthRecord>, Error> {
  try {
    // Return all health records
    return Result.Ok(healthRecordsStorage.values());
  } catch (error) {
    return Result.Err({ NotFound: `Failed to get health records: ${error}` });
  }
}

// Function to add doctor
$update;
export function addDoctor(payload: Doctor): Result<Doctor, Error> {
  try {
    // Payload Validation
    if (!payload.name || !payload.specialization) {
      return Result.Err({ InvalidPayload: "Invalid doctor payload" });
    }

    // Generate UUID, create time, and add the payload
    const doctor: Doctor = {
      ...payload,
      id: uuidv4(),
      createdAt: ic.time(),
    };

    // Insert the doctor
    doctorsStorage.insert(doctor.id, doctor);

    // Return an OK with the doctor you saved
    return Result.Ok(doctor);
  } catch (error) {
    return Result.Err({ InvalidPayload: `Failed to add doctor: ${error}` });
  }
}

// Function to get all doctors
$query;
export function getDoctors(): Result<Vec<Doctor>, Error> {
  try {
    // Return all doctors
    return Result.Ok(doctorsStorage.values());
  } catch (error) {
    return Result.Err({ NotFound: `Failed to get doctors: ${error}` });
  }
}

// Function to add prescription
$update;
export function addPrescription(payload: Prescription): Result<Prescription, Error> {
  try {
    // Payload Validation
    if (!payload.doctorID || !payload.patientID || !payload.medication || !payload.dosage) {
      return Result.Err({ InvalidPayload: "Invalid prescription payload" });
    }

    // Validate patient and doctor existence
    const existingPatientOpt = patientsStorage.get(payload.patientID);
    const existingDoctorOpt = doctorsStorage.get(payload.doctorID);
    if (!existingPatientOpt || !existingDoctorOpt) {
      return Result.Err({ NotFound: "Patient or doctor not found" });
    }

    // Generate UUID, create time, and add the payload
    const prescription: Prescription = {
      ...payload,
      id: uuidv4(),
      createdAt: ic.time(),
    };

    // Insert the prescription
    prescriptionsStorage.insert(prescription.id, prescription);

    // Update health record with the prescription ID
    const healthRecordOpt = healthRecordsStorage.get(payload.patientID);
    if (healthRecordOpt && healthRecordOpt.Some?.prescriptionIDs) {
      // Ensure prescriptionIDs is initialized and handle the Opt type
      const prescriptionIDs = healthRecordOpt.Some.prescriptionIDs || [];

      // Ensure prescriptionIDs is an array
      const updatedHealthRecord = {
        ...healthRecordOpt.Some,
        prescriptionIDs: Opt.Some([...prescriptionIDs, prescription.id]), // Update the prescriptionIDs type
      };

      // Omit undefined properties from the updatedHealthRecord
      const definedPropertiesHealthRecord: HealthRecord = {
        id: updatedHealthRecord.id,
        patientID: updatedHealthRecord.patientID,
        uniqueNumber: updatedHealthRecord.uniqueNumber,
        officerID: updatedHealthRecord.officerID,
        diagnosisNotes: updatedHealthRecord.diagnosisNotes,
        labTestIDs: updatedHealthRecord.labTestIDs,
        prescriptionIDs: updatedHealthRecord.prescriptionIDs.Some || [], // Extract array or provide empty array
        createdAt: updatedHealthRecord.createdAt,
      };
      

      healthRecordsStorage.insert(definedPropertiesHealthRecord.id, definedPropertiesHealthRecord);
    }


    // Return an OK with the prescription you saved
    return Result.Ok(prescription);
  } catch (error) {
    return Result.Err({ InvalidPayload: `Failed to add prescription: ${error}` });
  }
}

// Function to get all prescriptions
$query;
export function getPrescriptions(): Result<Vec<Prescription>, Error> {
  try {
    // Return all prescriptions
    return Result.Ok(prescriptionsStorage.values());
  } catch (error) {
    return Result.Err({ NotFound: `Failed to get prescriptions: ${error}` });
  }
}

// Function to add lab test
$update;
export function addLabTest(payload: LabTest): Result<LabTest, Error> {
  try {
    // Payload Validation
    if (!payload.doctorID || !payload.patientID || !payload.testType || !payload.results) {
      return Result.Err({ InvalidPayload: "Invalid lab test payload" });
    }

    // Validate patient and doctor existence
    const existingPatientOpt = patientsStorage.get(payload.patientID);
    const existingDoctorOpt = doctorsStorage.get(payload.doctorID);
    if (!existingPatientOpt || !existingDoctorOpt) {
      return Result.Err({ NotFound: "Patient or doctor not found" });
    }

    // Generate UUID, create time, and add the payload
    const labTest: LabTest = {
      ...payload,
      id: uuidv4(),
      createdAt: ic.time(),
    };

    // Insert the lab test
    labTestsStorage.insert(labTest.id, labTest);

    // Update health record with the lab test ID
    const healthRecordOpt = healthRecordsStorage.get(payload.patientID);

    if (healthRecordOpt && healthRecordOpt.Some?.labTestIDs) {
      // Ensure labTestIDs is initialized and handle the Opt type
      const labTestIDs = healthRecordOpt.Some.labTestIDs.Some || [];

      // Ensure labTestIDs is an array
      const updatedHealthRecord = {
        ...healthRecordOpt.Some,
        labTestIDs: Opt.Some([...labTestIDs, labTest.id]), // Update the labTestIDs type
      };

      // Omit undefined properties from the updatedHealthRecord
      const definedPropertiesHealthRecord = Object.fromEntries(
        Object.entries(updatedHealthRecord).filter(([_, v]) => v !== undefined)
      ) as HealthRecord;

      healthRecordsStorage.insert(definedPropertiesHealthRecord.id, definedPropertiesHealthRecord);
    }


    // Return an OK with the lab test you saved
    return Result.Ok(labTest);
  } catch (error) {
    return Result.Err({ InvalidPayload: `Failed to add lab test: ${error}` });
  }
}

// Function to get all lab tests
$query;
export function getLabTests(): Result<Vec<LabTest>, Error> {
  try {
    // Return all lab tests
    return Result.Ok(labTestsStorage.values());
  } catch (error) {
    return Result.Err({ NotFound: `Failed to get lab tests: ${error}` });
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