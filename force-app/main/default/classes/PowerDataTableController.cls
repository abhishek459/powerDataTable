public with sharing class PowerDataTableController {
    static final String PICKLIST_TYPE = String.valueOf(DisplayType.PICKLIST);

    public class FieldMetadataWrapper {
        @AuraEnabled public String path { get; set; } // Field API name of this field
        @AuraEnabled public String label { get; set; } // Label of this field
        @AuraEnabled public String type { get; set; } // Data type of this field value
        @AuraEnabled public Object value { get; set; } // Value attribute stored for this field in record
        @AuraEnabled public Boolean required { get; set; } // Whether this field is required or not when saving
        @AuraEnabled public Boolean isPicklist { get; set; } // Whether this field is a picklist type

        public FieldMetadataWrapper(String path, String label, String type, Boolean required) {
            this.path = path;
            this.label = label;
            this.type = type;
            this.required = required;
        }
    }

    public class DataWrapper {
        @AuraEnabled public String recordId { get; set; }
        @AuraEnabled public List<FieldMetadataWrapper> fieldValues { get; set; }
        
        public DataWrapper(String recordId, List<FieldMetadataWrapper> fieldValues) {
            this.recordId = recordId;
            this.fieldValues = fieldValues;
        }
    }

    public class RecordWrapper {
        @AuraEnabled public List<FieldMetadataWrapper> sObjectFieldMetadataList { get; set; }
        @AuraEnabled public List<DataWrapper> records { get; set; }
        @AuraEnabled public Map<String, List<Map<String, String>>> picklistOptions { get; set; }
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
            List<FieldMetadataWrapper> sObjectFieldMetadataList = new List<FieldMetadataWrapper>();
            for (Schema.FieldSetMember fieldSetMember : fields) {
                queryString += ', ' + fieldSetMember.getFieldPath();
                FieldMetadataWrapper header = new FieldMetadataWrapper(
                    fieldSetMember.getFieldPath(), 
                    fieldSetMember.getLabel(), 
                    String.valueOf(fieldSetMember.getType()),
                    fieldSetMember.getRequired()
                );
                sObjectFieldMetadataList.add(header);
            }
            RecordWrapper myRecordWrapper = new RecordWrapper();
            myRecordWrapper.sObjectFieldMetadataList = sObjectFieldMetadataList;
            myRecordWrapper.records = new List<DataWrapper>();

            queryString += ' FROM ' + objectName + ' ORDER BY CreatedDate DESC LIMIT 25';

            List<sObject> records = Database.Query(queryString);
            for (sObject record : records) {
                List<FieldMetadataWrapper> fieldWrappers = new List<FieldMetadataWrapper>();
                Map<String, Object> fieldValues = record.getPopulatedFieldsAsMap();
                for (FieldMetadataWrapper header : sObjectFieldMetadataList) {
                    FieldMetadataWrapper fieldData = new FieldMetadataWrapper(header.path, header.label, header.type, header.required);
                    fieldData.value = fieldValues.get(header.path) == null ? '' : fieldValues.get(header.path);
                    fieldData.isPicklist = fieldData.type == PICKLIST_TYPE ? true : false;
                    fieldWrappers.add(fieldData);
                }
                DataWrapper recordData = new DataWrapper(String.valueOf(record.get('Id')), fieldWrappers);
                myRecordWrapper.records.add(recordData);
            }

            Map<String, List<Map<String, String>>> picklistOptions = new Map<String, List<Map<String, String>>>();
            for (FieldMetadataWrapper fieldMetada : myRecordWrapper.sObjectFieldMetadataList) {
                if (fieldMetada.type == PICKLIST_TYPE) {
                    picklistOptions.put(fieldMetada.path, new List<Map<String, String>>());
                    List<Schema.PicklistEntry> picklistValues = Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldMetada.path).getDescribe().getPicklistValues();
                    
                    for(Schema.PicklistEntry pickListVal : picklistValues) {
                        picklistOptions.get(fieldMetada.path).add(new Map<String, String>{'label'=>pickListVal.getLabel(), 'value'=>pickListVal.getValue()});
                    }
                }
            }

            myRecordWrapper.picklistOptions = picklistOptions;

            return myRecordWrapper;
        } catch (Exception e) {
            throw e;
        }
    }
}