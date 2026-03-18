import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
 

@Injectable({
  providedIn: 'root',
})
export class Feeds {
  private apiUrl = `${environment.apiUrl}/home/feeds`;
  private provinceApi = environment.ProvinceAPI;

  constructor(private http: HttpClient) { }

  // Lấy user theo ID
  getFeeds(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  createNewPost(newPostData: any): Observable<any> {
    return this.http.post(this.apiUrl, newPostData);
  }

  getProvinces(): Observable<any> {
    return this.http.get(this.provinceApi);
  }
}
