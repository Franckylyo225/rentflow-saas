DELETE FROM sms_logs WHERE sms_message_id IN ('87f5819e-19b0-46e9-b260-ab24600d6179', '570cb41d-840d-4984-904f-dca1517fa1d2');
DELETE FROM sms_messages WHERE id IN ('87f5819e-19b0-46e9-b260-ab24600d6179', '570cb41d-840d-4984-904f-dca1517fa1d2');
DELETE FROM email_reminder_logs WHERE rent_payment_id = 'b0741dfa-eae3-4bd2-9a92-da6dd8c1ffd0';
DELETE FROM rent_payments WHERE id = 'b0741dfa-eae3-4bd2-9a92-da6dd8c1ffd0';