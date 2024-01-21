import { LightningElement, api, track } from 'lwc';
import fetchRecords from "@salesforce/apex/PowerDataTableController.fetchRecords";

const dataTypeMapping = {
    'STRING': 'text',
    'DATETIME': 'datetime',
    'CURRENCY': 'currency'
}

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
            this.updateTrackedChanges(recordFieldData, recordId);
            recordFieldData.editing = false;
            console.log(JSON.stringify(this.trackedChanges));
        } catch (error) {
            console.error(error);
        }
    }

    updateTrackedChanges(recordFieldData, recordId) {
        if (!recordFieldData.value || recordFieldData.originalValue === recordFieldData.value) {
            this.trackedChanges[recordId] = this.trackedChanges[recordId] || {};
            delete this.trackedChanges[recordId][recordFieldData.path];
            if (Object.keys(this.trackedChanges[recordId]).length === 0) {
                delete this.trackedChanges[recordId];
            }
        } else {
            this.trackedChanges[recordId] = this.trackedChanges[recordId] || {};
            this.trackedChanges[recordId][recordFieldData.path] = recordFieldData.value;
        }
    }

    fetchFocus(event) {
        event.target.focus();
    }

    sortByColumn(event) {
        const fieldPath = event.currentTarget.dataset.fieldPath;
        console.log(fieldPath);
    }
}