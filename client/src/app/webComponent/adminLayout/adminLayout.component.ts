import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserAdminLayoutComponent } from '../userAdminLayout/userAdminLayout.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, UserAdminLayoutComponent],
  templateUrl: './adminLayout.component.html',
  styleUrl: './adminLayout.component.css'
})
export class AdminLayoutComponent {
  currentTab = signal('Dashboard');

  navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
    { id: 'Users', label: 'Users', icon: 'bi-people-fill' },
    { id: 'Server', label: 'Server', icon: 'bi-hdd-network-fill' },
    { id: 'Reports', label: 'Reports', icon: 'bi-file-earmark-text-fill' },
    { id: 'Settings', label: 'Settings', icon: 'bi-gear-fill' },
  ];

  stats = [
    { label: 'Total Users', value: '1.24M', trend: '+12.5%', icon: 'bi-people', color: 'primary' },
    { label: 'Active Nodes', value: '842', trend: 'Stable', icon: 'bi-activity', color: 'primary' },
    { label: 'Server Latency', value: '18ms', trend: '-2ms gain', icon: 'bi-lightning-charge', color: 'primary' },
    { label: 'Messages/sec', value: '4.2k', trend: 'Peak load', icon: 'bi-chat-dots', color: 'primary' },
  ];

  events = [
    { id: '#X-10293', status: 'Success', origin: 'US-EAST-01', latency: '12ms', timestamp: '10:42:15 AM' },
    { id: '#X-10294', status: 'Success', origin: 'EU-WEST-04', latency: '24ms', timestamp: '10:42:12 AM' },
    { id: '#X-10295', status: 'Active', origin: 'AS-SOUTH-02', latency: '48ms', timestamp: '10:42:08 AM' },
  ];

  chartData = [
    { name: 'MON', height: 45 },
    { name: 'TUE', height: 40 },
    { name: 'WED', height: 35 },
    { name: 'THU', height: 65 },
    { name: 'FRI', height: 80 },
    { name: 'SAT', height: 55 },
    { name: 'SUN', height: 95 },
  ];

  topHubs = [
    { name: 'North America', value: 342, percent: '85%' },
    { name: 'Europe Central', value: 298, percent: '70%' },
  ];

  selectTab(tabId: string) {
    this.currentTab.set(tabId);
  }
}
