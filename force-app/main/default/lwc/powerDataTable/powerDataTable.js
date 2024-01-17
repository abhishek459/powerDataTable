import { LightningElement, api } from 'lwc';

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
    fetchRecordsOfFieldSet() {
        this.loading = true;
    }

    connectedCallback() {
        window.addEventListener("online", function () {
            this.connectedToInternet = true;
        });

        window.addEventListener("offline", function () {
            this.connectedToInternet = false;
        });
    }
}