public with sharing class PowerDataTableController {
    public class HeaderWrapper {
        @AuraEnabled public String path { get; set; }
        @AuraEnabled public String label { get; set; }
        @AuraEnabled public String type { get; set; }
        @AuraEnabled public Object value { get; set; }
        @AuraEnabled public Boolean required { get; set; }

        public HeaderWrapper(String path, String label, String type, Object value, Boolean required) {
            this.path = path; // Field API name of this field in Salesforce
            this.label = label; // Label of this field in Salesforce
            this.type = type; // Data type of this field value
            this.value = value; // Value attribute stored for this field in record
            this.required = required; // Whether this field is required in Salesforce
        }
    }

    public class DataWrapper {
        @AuraEnabled public String recordId { get; set; }
        @AuraEnabled public List<HeaderWrapper> fieldValues { get; set; }
        
        public DataWrapper(String recordId, List<HeaderWrapper> fieldValues) {
            this.recordId = recordId;
            this.fieldValues = fieldValues;
        }
    }

    public class RecordWrapper {
        @AuraEnabled public List<HeaderWrapper> headers { get; set; }
        @AuraEnabled public List<DataWrapper> records { get; set; }
    }

    @AuraEnabled
    public static RecordWrapper fetchRecords(String objectName, String fieldSetName) {
        try {
            Schema.FieldSet fieldSet = Schema.getGlobalDescribe().get(objectName).getDescribe().fieldSets.getMap().get(fieldSetName);
            if (fieldSet == NULL) {
                throw new AuraHandledException('Please provide a valid field set name');
            }
            List<Schema.FieldSetMember> fields = fieldSet.getFields();

            String queryString = 'SELECT Id';
            List<HeaderWrapper> headers = new List<HeaderWrapper>();
            for (Schema.FieldSetMember fieldSetMember : fields) {
                queryString += ', ' + fieldSetMember.getFieldPath();
                HeaderWrapper header = new HeaderWrapper(
                    fieldSetMember.getFieldPath(), 
                    fieldSetMember.getLabel(), 
                    String.valueOf(fieldSetMember.getType()),
                    null,
                    fieldSetMember.getRequired()
                );
                headers.add(header);
            }
            RecordWrapper myRecordWrapper = new RecordWrapper();
            myRecordWrapper.headers = headers;
            myRecordWrapper.records = new List<DataWrapper>();

            queryString += ' FROM ' + objectName + ' ORDER BY CreatedDate DESC';

            List<sObject> records = Database.Query(queryString);
            List<RecordWrapper> recordsData = new List<RecordWrapper>();
            for (sObject record : records) {
                List<HeaderWrapper> fieldWrappers = new List<HeaderWrapper>();
                Map<String, Object> fieldValues = record.getPopulatedFieldsAsMap();
                for (HeaderWrapper header : headers) {
                    HeaderWrapper newHeader = new HeaderWrapper(header.path, header.label, header.type, fieldValues.get(header.path) == null ? '' : fieldValues.get(header.path), header.required);
                    fieldWrappers.add(newHeader);
                }
                DataWrapper recordData = new DataWrapper(String.valueOf(record.get('Id')), fieldWrappers);
                myRecordWrapper.records.add(recordData);
            }
            return myRecordWrapper;
        } catch (Exception e) {
            throw e;
        }
    }
}