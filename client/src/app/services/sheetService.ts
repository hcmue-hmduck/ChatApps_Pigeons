import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SheetService {
    private apiUrl = `${environment.apiUrl}/home/sheet`;
    constructor(private http: HttpClient) { }

    getSheet(): Observable<any> {
        return this.http.get(this.apiUrl);
    }

    createSheet(data: any): Observable<any> {
        return this.http.post(this.apiUrl, data);
    }
}