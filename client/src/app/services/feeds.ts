import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
 

@Injectable({
  providedIn: 'root',
})
export class Feeds {
  private apiUrl = `${environment.apiUrl}/home/feeds`;

  constructor(private http: HttpClient) { }

  // Lấy user theo ID
  getFeeds(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${userId}`);
  }
}
