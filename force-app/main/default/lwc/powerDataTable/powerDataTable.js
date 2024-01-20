import { LightningElement, api, track } from 'lwc';
import fetchRecords from "@salesforce/apex/PowerDataTableController.fetchRecords";

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
    connectedToInternet = true;

    loading = false;
    @track recordsWrapper = {};
    fetchRecordsOfFieldSet() {
        this.loading = true;
        fetchRecords({ objectName: 'Account', fieldSetName: 'Account_FieldSet' }).then(response => {
            this.recordsWrapper = response;
        }).catch(error => {
            console.error(error);
        })
    }

    connectedCallback() {
        window.addEventListener("online", function () {
            this.connectedToInternet = true;
            // Use navigator.onLine
        });

        window.addEventListener("offline", function () {
            this.connectedToInternet = false;
        });
    }

    enableInlineEdit(event) {
        const recordIndex = event.currentTarget.dataset.recordIndex;
        const fieldIndex = event.currentTarget.dataset.fieldIndex;
        // const recordId = event.currentTarget.dataset.recordId;
        const fieldType = event.currentTarget.dataset.fieldType;
        switch (fieldType) {
            case 'STRING':
                this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex].inputType = 'text';
                break;
            case 'CURRENCY':
                this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex].inputType = 'number';
                break;
            case 'DATETIME':
                this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex].inputType = 'datetime';
                break;
            default:
                break;
        }
        console.log(fieldType);

        this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex].editing = true;
    }

    disableInlineEdit(event) {
        const recordIndex = event.currentTarget.dataset.recordIndex;
        const fieldIndex = event.currentTarget.dataset.fieldIndex;
        // const recordId = event.currentTarget.dataset.recordId;

        this.recordsWrapper.records[recordIndex].fieldValues[fieldIndex].editing = false;
    }

    fetchFocus(event) {
        event.target.focus();
    }

    sortByColumn(event) {
        const fieldPath = event.currentTarget.dataset.fieldPath;
        console.log(fieldPath);
    }
}