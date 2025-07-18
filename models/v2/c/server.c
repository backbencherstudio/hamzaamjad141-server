// #include <winsock2.h>
// #include <stdio.h>

// #pragma comment(lib, "ws2_32.lib")

// int main() {
//     WSADATA w;
//     SOCKET s, c;
//     struct sockaddr_in a;
//     int l = sizeof(a);
//     char buffer[2048];

//     FILE *file = fopen("data.json", "rb");
//     if (!file) {
//         printf("json not found\n");
//         return 1;
//     }

//     fseek(file, 0, SEEK_END);
//     long json_len = ftell(file);
//     rewind(file);

//     char *json_data = (char *)malloc(json_len + 1); 


//     fread(json_data, 1, json_len, file);
//     json_data[json_len] = '\0'; 
//     fclose(file);              

//     // Step 2: Prepare the HTTP response
//     char response[4096]; 
//     sprintf(response,
//         "HTTP/1.1 200 OK\r\n"            
//         "Content-Type: application/json\r\n" 
//         "Content-Length: %ld\r\n"         
//         "\r\n"                            
//         "%s", json_len, json_data);      


//     WSAStartup(MAKEWORD(2,2), &w);


//     s = socket(AF_INET, SOCK_STREAM, 0);


//     a.sin_family = AF_INET;        
//     a.sin_addr.s_addr = INADDR_ANY;
//     a.sin_port = htons(3000);      


//     bind(s, (struct sockaddr*)&a, sizeof(a));


//     listen(s, 5);

//     while ((c = accept(s, (struct sockaddr*)&a, &l)) != INVALID_SOCKET) {

//         recv(c, buffer, sizeof(buffer) - 1, 0);
//         send(c, response, (int)strlen(response), 0); 
//         closesocket(c); 
//     }


//     free(json_data);   
//     closesocket(s);    
//     WSACleanup();    
//     return 0;
// }















// #include <winsock2.h>
// #include <stdio.h>


// #pragma comment(lib, "ws2_32.lib")

// int main() {
//     // ======================
//     // PART 1: READ JSON FILE
//     // ======================
    
//     // Try to open the JSON file
//     FILE *file = fopen("data.json", "rb");
//     if (!file) {
//         printf("Error: Could not find data.json file\n");
//         return 1;  // Exit if file not found
//     }
    
//     // Find out how big the file is
//     fseek(file, 0, SEEK_END);  // Go to end of file
//     long file_size = ftell(file);  // Get size
//     rewind(file);  // Go back to start
    
//     // Make space to store the file contents
//     char *json_data = (char *)malloc(file_size + 1);
    
//     // Read the file into memory
//     fread(json_data, 1, file_size, file);
//     json_data[file_size] = '\0';  // Add end marker
//     fclose(file);  // Close the file
    
//     // ======================
//     // PART 2: CREATE WEB SERVER
//     // ======================
    
//     // Prepare the web response
//     char web_response[5000];  // Big enough space
//     sprintf(web_response,
//         "HTTP/1.1 200 OK\r\n"
//         "Content-Type: application/json\r\n"
//         "Content-Length: %ld\r\n"
//         "\r\n"  // This empty line separates headers from content
//         "%s",   // The JSON data goes here
//         file_size, json_data);
    
//     // Start Windows networking
//     WSADATA wsaData;
//     WSAStartup(MAKEWORD(2, 2), &wsaData);
    
//     // Create a socket (like opening a phone line)
//     SOCKET server_socket = socket(AF_INET, SOCK_STREAM, 0);
    
//     // Set up the address to listen on
//     struct sockaddr_in server_address;
//     server_address.sin_family = AF_INET;  // Use IPv4
//     server_address.sin_addr.s_addr = INADDR_ANY;  // Listen on all network cards
//     server_address.sin_port = htons(3000);  // Listen on port 3000
    
//     // Bind the socket to our address
//     bind(server_socket, (struct sockaddr*)&server_address, sizeof(server_address));
    
//     // Start listening for connections (max 5 waiting)
//     listen(server_socket, 5);
    
//     printf("Server is running on port 3000...\n");
    
//     // ======================
//     // PART 3: HANDLE REQUESTS
//     // ======================
    
//     while (1) {  // Keep running forever
//         // Wait for a connection
//         SOCKET client_socket = accept(server_socket, NULL, NULL);
        
//         // When someone connects:
//         char request[2048];
//         recv(client_socket, request, sizeof(request), 0);  // Read their request
        
//         // Send our prepared response
//         send(client_socket, web_response, strlen(web_response), 0);
        
//         // Close this connection
//         closesocket(client_socket);
        
//         printf("Served a request!\n");
//     }
    
//     // Cleanup (though we never get here in this simple version)
//     free(json_data);
//     closesocket(server_socket);
//     WSACleanup();
//     return 0;
// }








#include <winsock2.h>
#include <stdio.h>
#include <string.h>

#pragma comment(lib, "ws2_32.lib")

int main() {
 
    WSADATA wsa;
    WSAStartup(MAKEWORD(2,2), &wsa);

 
    SOCKET server = socket(AF_INET, SOCK_STREAM, 0);
    
 
    struct sockaddr_in addr;
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(3000);
    
 
    bind(server, (struct sockaddr*)&addr, sizeof(addr));
    listen(server, 1);
    printf("Server ready at port 3000...\n");

    while(1) {
 
        SOCKET client = accept(server, NULL, NULL);
        char req[1024];
        recv(client, req, sizeof(req), 0);

 
        if (strstr(req, "username=")) {
            char* user = strstr(req, "username=") + 9;
            char username[100] = {0};
            int i = 0;
            while (*user != '&' && *user != ' ' && i < 99) {
                username[i++] = *user++;
            }
            printf("User entered: %s\n", username);
        }

 
        char res[] = "HTTP/1.1 200 OK\r\n\r\nOK";
        send(client, res, strlen(res), 0);
        closesocket(client);
    }

    closesocket(server);
    WSACleanup();
    return 0;
}


 