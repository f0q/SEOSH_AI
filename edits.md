When clicking "View", I want to be able to export the content in a format like JSON with a single button.
The "View" section should also include a button to generate an `llms.txt` file.
All content operations, including new content generation, need to be clearly defined. This is to enable our autopilot to automatically execute these commands and send content units to the user for approval in the future. 

I also want to add a "Publish Actions" button. This button will contain smaller buttons for platforms like Telegram, WordPress, etc., in the future. Clicking these will automatically publish content to the specified social network. The settings for these integrations should be configured in the project settings, not user settings. This is because a user might have multiple networks or sites, and our system has a strict project-based association. Therefore, these connectors need to be specified in the project's autopilot settings. This is for future implementation. 


Also, globally, one task needs to be solved: connecting the txt.ru and pixel tools services.  