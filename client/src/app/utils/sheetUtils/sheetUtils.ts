import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SheetUtils {
    handleCreateSheet = async (sheetName: string, conversationId: string): Promise<any> => {
        const http = inject(HttpClient);
        const apiUrl = `${environment.apiUrl}/home/sheets`;
        try {
            const response = await http.post(apiUrl, { sheetName, conversationId }).toPromise();
            return response;
        } catch (error) {
            console.error('Error creating sheet:', error);
            throw error;
        }
    };

    handleGetSheets = async (conversationId: string): Promise<any> => {
        const http = inject(HttpClient);
        const apiUrl = `${environment.apiUrl}/home/sheets/${conversationId}`;
        try {
            const response = await http.get(apiUrl).toPromise();
            return response;
        } catch (error) {
            console.error('Error fetching sheets:', error);
            throw error;
        }
    }
}