INSERT INTO public.permissions ("permission",description) VALUES
	 ('test','Access to test features'),
	 ('vitals','View and record patient vitals'),
	 ('admin','Create, edit, and delete user accounts, roles and permissions'),
	 ('doctor','Access to doctor-specific features'),
	 ('lab','Access to lab report entry and management'),
	 ('inventory','Access to inventory details');

INSERT INTO public.roles (name,allowed) VALUES
	 ('Frontdesk','{vitals}'),
	 ('Doctor','{doctor}'),
	 ('Lab Technician','{lab}'),
	 ('Admin','{admin}'),
	 ('Inventory','{inventory}'),
	 ('Superuser','{vitals,doctor,lab,admin,test,inventory}');

INSERT INTO public.users (username,"passwordHash",email,name,phone,"role") VALUES
	 ('desk','$2y$10$7PpYNxREs8KveeExiZAoD.Cfnx.Usuxp1rI04VNYObYsUdRGOwpGK','desk@medc.com','Front Desk','0',1),
	 ('doc1','$2y$10$7PpYNxREs8KveeExiZAoD.Cfnx.Usuxp1rI04VNYObYsUdRGOwpGK','doc1@medc.com','Doctor 1','0',2),
	 ('doc2','$2y$10$7PpYNxREs8KveeExiZAoD.Cfnx.Usuxp1rI04VNYObYsUdRGOwpGK','doc2@medc.com','Doctor 2','0',2),
	 ('lab','$2y$10$7PpYNxREs8KveeExiZAoD.Cfnx.Usuxp1rI04VNYObYsUdRGOwpGK','lab@medc.com','Lab Technician','0',3),
	 ('admin','$2y$10$7PpYNxREs8KveeExiZAoD.Cfnx.Usuxp1rI04VNYObYsUdRGOwpGK','admin@medc.com','Admin User','0',4),
	 ('inventory','$2y$10$7PpYNxREs8KveeExiZAoD.Cfnx.Usuxp1rI04VNYObYsUdRGOwpGK','inventory@medc.com','Inventory User','0',5),
	 ('root','$2y$10$7PpYNxREs8KveeExiZAoD.Cfnx.Usuxp1rI04VNYObYsUdRGOwpGK','root@medc.com','Root User','0',6);
