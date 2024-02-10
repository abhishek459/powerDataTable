import { LightningElement, api, track } from 'lwc';
import fetchRecordsByFieldSet from "@salesforce/apex/PowerDataTableController.fetchRecordsByFieldSet";
import getRecordsFromQuery from "@salesforce/apex/PowerDataTableController.getRecordsFromQuery";

const dataTypeMapping = {
    'STRING': 'text',
    'DATETIME': 'datetime',
    'CURRENCY': 'currency'
}

const isEditedClass = 'slds-is-edited';

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
    year: '2-digit',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
});

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
    sortingRecords = false;
    picklistOptions = {};

    @track recordsWrapper = {};
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
        fetchRecordsByFieldSet({ objectName: 'Account', fieldSetName: 'Account_FieldSet' }).then(response => {
            this.recordsWrapper = response;
            console.log(response);
            this.picklistOptions = this.recordsWrapper.picklistOptions;
            console.log(this.recordsWrapper);
        }).catch(error => {
            console.error(error);
        })
    }

    enableInlineEdit(event) {
        const recordIndex = event.currentTarget.dataset.recordIndex;
        const fieldIndex = event.currentTarget.dataset.fieldIndex;
        const fieldType = event.currentTarget.dataset.fieldType;
        const recordData = this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex];
        recordData.inputType = dataTypeMapping[fieldType];
        recordData.picklistOptions = this.picklistOptions[recordData.path];
        recordData.editing = true;
    }

    saveChangesAndDisableInlineEdit(event) {
        const recordIndex = event.currentTarget.dataset.recordIndex;
        const fieldIndex = event.currentTarget.dataset.fieldIndex;
        const recordId = this.recordsWrapper.records[recordIndex].recordId;
        const value = event.target.value;

        const recordFieldData = this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex];
        recordFieldData.originalValue = recordFieldData.originalValue || recordFieldData.value;
        recordFieldData.value = value;
        recordFieldData.formattedValue = this.getFormattedValue(recordFieldData);
        this.updateTrackedChanges(recordIndex, fieldIndex, recordId);
        recordFieldData.editing = false;
        console.log(JSON.stringify(this.trackedChanges));
    }

    getFormattedValue(recordFieldData) {
        switch (recordFieldData.type) {
            case 'DATETIME':
                let value = dateTimeFormatter.format(new Date(recordFieldData.value));
                value = value.slice(0, -2) + value.slice(-2).toUpperCase();
                return value;
            case 'CURRENCY':
            case 'DECIMAL':
            case 'INTEGER':
                return Number(recordFieldData.value).toLocaleString();
            default:
                return recordFieldData.value;
        }
    }

    updateTrackedChanges(recordIndex, fieldIndex, recordId) {
        const recordFieldData = this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex];
        const domElement = this.template.querySelector(`td[data-record-index="${recordIndex}"][data-field-index="${fieldIndex}"]`);
        if (recordFieldData.originalValue == recordFieldData.value) { // Double Equal to comparison operator because we dont want to type check at this point.
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
        Object.keys(this.trackedChanges)?.forEach(recordId => {
            const recordFields = this.trackedChanges[recordId];
            Object.keys(recordFields)?.forEach(fieldAPI => {
                const recordIndex = this.trackedChanges[recordId][fieldAPI].recordIndex;
                const fieldIndex = this.trackedChanges[recordId][fieldAPI].fieldIndex;
                const recordFieldData = this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex];
                recordFieldData.value = recordFieldData.originalValue;
                recordFieldData.formattedValue = this.getFormattedValue(recordFieldData);
                const domElement = this.template.querySelector(`td[data-record-index="${recordIndex}"][data-field-index="${fieldIndex}"]`);
                domElement?.classList.remove(isEditedClass);
            });
        });
        this.trackedChanges = {};
    }

    fetchFocus(event) {
        event.target.focus();
    }

    sortByColumn(event) {
        this.sortingRecords = true;
        const fieldPath = event.currentTarget.dataset.fieldPath;
        const queryString = this.buildQueryAndFetchRecords(fieldPath);
        this.getRecordsFromQuery(queryString, fieldPath);
    }

    buildQueryAndFetchRecords(fieldPath) {
        let item = this.recordsWrapper.sObjectFieldMetadataList.find(item => item.path === fieldPath);
        const queryString = this.recordsWrapper.queryString;
        const queryArray = queryString.split(' ');
        queryArray[queryArray.length - 4] = fieldPath; // Adding the field which the query needs to be sorted by
        queryArray[queryArray.length - 3] = item.ascending ? 'DESC' : 'ASC';
        if (item.ascending) queryArray.splice(queryArray.length - 6, 0, 'WHERE ' + fieldPath + '!=NULL'); // Adding a conditional WHERE Clause as descending records include NULL values at top
        const newQueryString = queryArray.join(' ');
        console.log('newQueryString - ', newQueryString);
        return newQueryString;
    }

    getRecordsFromQuery(newQueryString, fieldPath) {
        getRecordsFromQuery({ queryString: newQueryString, sObjectFieldMetadataList: this.recordsWrapper.sObjectFieldMetadataList }).then(response => {
            this.recordsWrapper.records = response.records;
            this.setSortIcons(fieldPath);
        }).catch(error => {
            console.error(error);
        }).finally(_ => {
            this.sortingRecords = false;
        });
    }

    setSortIcons(fieldPath) {
        this.recordsWrapper.sObjectFieldMetadataList.forEach(item => {
            if (item.path === fieldPath) {
                item.isSortedBy = true;
                item.ascending = item.ascending ? !item.ascending : true;
            } else {
                item.isSortedBy = false;
                item.ascending = undefined;
            }
        });
    }
}