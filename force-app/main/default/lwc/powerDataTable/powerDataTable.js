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
            console.log(response);
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
        this.fetchRecordsOfFieldSet();
    }
}