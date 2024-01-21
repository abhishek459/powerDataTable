import { LightningElement, api, track } from 'lwc';
import fetchRecords from "@salesforce/apex/PowerDataTableController.fetchRecords";

const dataTypeMapping = {
    'STRING': 'text',
    'DATETIME': 'datetime',
    'CURRENCY': 'currency'
}

const isEditedClass = 'slds-is-edited';

export default class PowerDataTable extends LightningElement {
    _fieldSetName;
    @api get fieldsetName() {
        return this._fieldSetName;
    }

    set fieldsetName(value) {
        if (value !== this._fieldSetName) {
            this._fieldSetName = value;
            this.fetchRecordsOfFieldSet();
        }
    }

    _objectName;
    @api get objectName() {
        return this._objectName;
    }

    set objectName(value) {
        if (value !== this._objectName) {
            this._objectName = value;
            this.fetchRecordsOfFieldSet();
        }
    }

    // connectedToInternet = true;

    loading = false;
    @track recordsWrapper = {};
    picklistOptions = {};
    @track trackedChanges = {};

    get unsavedChanges() {
        return Object.keys(this.trackedChanges)?.length > 0;
    }

    connectedCallback() {
        // window.addEventListener("online", function () {
        //     this.connectedToInternet = true;
        //     // Use navigator.onLine
        // });

        // window.addEventListener("offline", function () {
        //     this.connectedToInternet = false;
        // });
    }

    fetchRecordsOfFieldSet() {
        if (!this.objectName || !this.fieldsetName) {
            return;
        }
        this.loading = true;
        fetchRecords({ objectName: 'Account', fieldSetName: 'Account_FieldSet' }).then(response => {
            this.recordsWrapper = response;
            this.picklistOptions = this.recordsWrapper.picklistOptions;
            console.log(this.recordsWrapper);
        }).catch(error => {
            console.error(error);
        })
    }

    enableInlineEdit(event) {
        const recordIndex = event.currentTarget.dataset.recordIndex;
        const fieldIndex = event.currentTarget.dataset.fieldIndex;
        // const recordId = event.currentTarget.dataset.recordId;
        const fieldType = event.currentTarget.dataset.fieldType;
        const recordData = this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex];
        recordData.inputType = dataTypeMapping[fieldType];
        recordData.picklistOptions = this.picklistOptions[recordData.path];
        recordData.editing = true;
    }

    disableInlineEdit(event) {
        try {
            const recordIndex = event.currentTarget.dataset.recordIndex;
            const fieldIndex = event.currentTarget.dataset.fieldIndex;
            const recordId = this.recordsWrapper.records[recordIndex].recordId;
            const value = event.target.value;

            const recordFieldData = this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex];
            recordFieldData.originalValue = recordFieldData.originalValue || recordFieldData.value;
            recordFieldData.value = value;
            this.updateTrackedChanges(recordIndex, fieldIndex, recordId);
            recordFieldData.editing = false;
            console.log(JSON.stringify(this.trackedChanges));
        } catch (error) {
            console.error(error);
        }
    }

    updateTrackedChanges(recordIndex, fieldIndex, recordId) {
        const recordFieldData = this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex];
        const domElement = this.template.querySelector(`td[data-record-index="${recordIndex}"][data-field-index="${fieldIndex}"]`);
        if (!recordFieldData.value || recordFieldData.originalValue == recordFieldData.value) { // Double Equal to comparison operator because we dont want to type check at this point.
            this.trackedChanges[recordId] = this.trackedChanges[recordId] || {};
            delete this.trackedChanges[recordId][recordFieldData.path];
            if (Object.keys(this.trackedChanges[recordId]).length === 0) {
                delete this.trackedChanges[recordId];
            }
            domElement?.classList.remove(isEditedClass);
        } else {
            this.trackedChanges[recordId] = this.trackedChanges[recordId] || {};
            this.trackedChanges[recordId][recordFieldData.path] = {
                value: recordFieldData.value,
                recordIndex: recordIndex,
                fieldIndex: fieldIndex
            };
            domElement?.classList.add(isEditedClass);
        }
    }

    discardChanges() {
        Object.keys(this.trackedChanges).forEach(recordId => {
            const recordFields = this.trackedChanges[recordId];
            Object.keys(recordFields).forEach(fieldAPI => {
                const recordIndex = this.trackedChanges[recordId][fieldAPI].recordIndex;
                const fieldIndex = this.trackedChanges[recordId][fieldAPI].fieldIndex;
                const recordFieldData = this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex];
                recordFieldData.value = recordFieldData.originalValue;
                const domElement = this.template.querySelector(`td[data-record-index="${recordIndex}"][data-field-index="${fieldIndex}"]`);
                domElement.classList.remove(isEditedClass);
            });
        });
        this.trackedChanges = {};
    }

    fetchFocus(event) {
        event.target.focus();
    }

    sortByColumn(event) {
        const fieldPath = event.currentTarget.dataset.fieldPath;
        console.log(fieldPath);
    }
}