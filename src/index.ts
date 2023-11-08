import { query, update, Canister, text, Record, StableBTreeMap, Ok, None, Some, Err, Vec, Result, nat64, ic, Opt, Variant } from 'azle';

import { v4 as uuidv4 } from 'uuid';

const PatientPayload = Record({ name: text, age: nat64, gender: text, bloodType: text, medicalHistory: text });

const Patient = Record({ id: text, name: text, age: nat64, gender: text, bloodType: text, medicalHistory: text, createdAt: nat64, updatedAt: Opt(nat64) });

const Error = Variant({ NotFound: text, InvalidPayload: text, });

const patientsStorage = StableBTreeMap(text, Patient, 0);

export default Canister({

//Below we add the Patient to patientsStorage
addPatient: update([PatientPayload], Result(Patient, Error), (payload) => {
  //generate uuid, create and update time and our payload
  const patient = { id: uuidv4(), createdAt: ic.time(), updatedAt: None, ...payload };

  // Check for errors during insertion
  if (!patientsStorage.insert(patient.id, patient)) {
    return Err({ InvalidPayload: `Failed to insert patient with payload: ${JSON.stringify(payload)}` });
  }

  // Return an OK with the patient you saved
  return Ok(patient);
}),

//Below we get all patients from the storage
getPatients: query([], Result(Vec(Patient), Error), () => {
  return Ok(patientsStorage.values());
}),

//we get specific patient from the patients storage, we provide the uuid
getPatient: query([text], Result(Patient, Error), (id) => {
  const patientOpt = patientsStorage.get(id);

  if ("None" in patientOpt) {
    return Err({ NotFound: `the patient with id=${id} not found` });
  }

  return Ok(patientOpt.Some);
}),

//Update a patient already in the patientsStorage, we provide a uuid
updatePatient: update([text, PatientPayload], Result(Patient, Error), (id, payload) => {
  const patientOpt = patientsStorage.get(id);

  if ("None" in patientOpt) {
    return Err({ NotFound: `couldn't update a patient with id=${id}. patient not found` });
  }

  const patient = patientOpt.Some;
  const updatedPatient = { ...patient, ...payload, updatedAt: Some(ic.time()) };

  // Check for errors during update
  if (!patientsStorage.insert(patient.id, updatedPatient)) {
    return Err({ InvalidPayload: `Failed to update patient with ID: ${id} and payload: ${JSON.stringify(payload)}` });
  }

  return Ok(updatedPatient);
}),

//delete a patient from the patientsStorage, we provide a uuid to remove
deletePatient: update([text], Result(Patient, Error), (id) => {
  const deletedPatient = patientsStorage.remove(id);

  if ("None" in deletedPatient) {
    return Err({ NotFound: `couldn't delete a patient with id=${id}. patient not found` });
  }

  return Ok(deletedPatient.Some);
})

});

globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => { let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  }

};
