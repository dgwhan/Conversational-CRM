import { BaseApiClient } from './core.js';
import { createChannelApi } from './channels.js';
import { createCustomerApi } from './customers.js';
import { createWorkspaceApi } from './workspaces.js';
import { createContactApi } from './contacts.js';
import { createActivityApi } from './activities.js';
import { createDealApi } from './deals.js';
import { createMessageStorageApi } from './messaging-storage.js';
import { createKeywordRulesApi } from './keyword-rules.js';

export * from './types.js';
export * from './core.js';
export * from './channels.js';
export * from './customers.js';
export * from './workspaces.js';
export * from './contacts.js';
export * from './activities.js';
export * from './deals.js';
export * from './messaging-storage.types.js';
export * from './messaging-storage.js';
export * from './keyword-rules.js';

export class ApiClient extends BaseApiClient {
  private channels = createChannelApi(this);
  private customers = createCustomerApi(this);
  private workspaces = createWorkspaceApi(this);
  private contacts = createContactApi(this);
  private activities = createActivityApi(this);
  private deals = createDealApi(this);
  private messageStorage = createMessageStorageApi(this);
  private keywordRules = createKeywordRulesApi(this);

  // Sub-modules
  readonly channelApi = this.channels;
  readonly customerApi = this.customers;
  readonly workspaceApi = this.workspaces;
  readonly contactApi = this.contacts;
  readonly activityApi = this.activities;
  readonly dealApi = this.deals;
  readonly messageStorageApi = this.messageStorage;
  readonly keywordRulesApi = this.keywordRules;

  // Channel & OAuth APIs
  getAuthorizeUrl = this.channels.getAuthorizeUrl;
  exchangeOAuthToken = this.channels.exchangeOAuthToken;
  activateChannels = this.channels.activateChannels;
  getChannels = this.channels.getChannels;
  toggleChannel = this.channels.toggleChannel;
  disconnectChannel = this.channels.disconnectChannel;
  syncChannel = this.channels.syncChannel;
  sendMessage = this.channels.sendMessage;
  sendChannelTestMessage = this.channels.sendChannelTestMessage;
  markFacebookConversationSeen = this.channels.markFacebookConversationSeen;
  initZaloPersonalQr = this.channels.initZaloPersonalQr;
  getZaloPersonalQrStatus = this.channels.getZaloPersonalQrStatus;
  confirmZaloPersonalQr = this.channels.confirmZaloPersonalQr;
  getZaloSafetyConfig = this.channels.getZaloSafetyConfig;
  updateZaloSafetyConfig = this.channels.updateZaloSafetyConfig;

  // Customer & Message APIs
  getMessages = this.customers.getMessages;
  getCustomers = this.customers.getCustomers;
  updateCustomer = this.customers.updateCustomer;
  assignConversation = this.customers.assignConversation;
  deleteCustomerTag = this.customers.deleteCustomerTag;

  // Activity Timeline, Appointments & Task Management APIs
  getActivities = this.activities.getActivities;
  getCalendarEvents = this.activities.getCalendarEvents;
  getActivityById = this.activities.getActivityById;
  createActivity = this.activities.createActivity;
  updateActivity = this.activities.updateActivity;
  deleteActivity = this.activities.deleteActivity;
  getDueReminders = this.activities.getDueReminders;
  triggerAutoTestTask = this.activities.triggerAutoTestTask;

  // Workspace, Hotline & Notification APIs
  getMyWorkspaces = this.workspaces.getMyWorkspaces;
  createWorkspace = this.workspaces.createWorkspace;
  updateWorkspace = this.workspaces.updateWorkspace;
  deleteWorkspace = this.workspaces.deleteWorkspace;
  getWorkspaceHotlines = this.workspaces.getWorkspaceHotlines;
  createWorkspaceHotline = this.workspaces.createWorkspaceHotline;
  updateWorkspaceHotline = this.workspaces.updateWorkspaceHotline;
  deleteWorkspaceHotline = this.workspaces.deleteWorkspaceHotline;
  getNotifications = this.workspaces.getNotifications;
  markNotificationRead = this.workspaces.markNotificationRead;
  markUserNotificationRead = this.workspaces.markUserNotificationRead;
  markAllNotificationsRead = this.workspaces.markAllNotificationsRead;
  deleteNotification = this.workspaces.deleteNotification;
  getWorkspaceInvitation = this.workspaces.getWorkspaceInvitation;
  acceptWorkspaceInvitation = this.workspaces.acceptWorkspaceInvitation;
  declineWorkspaceInvitation = this.workspaces.declineWorkspaceInvitation;

  // Contact & Merge/Unmerge APIs
  getContacts = this.contacts.getContacts;
  checkDuplicatePhone = this.contacts.checkDuplicatePhone;
  mergeContacts = this.contacts.mergeContacts;
  unmergeContact = this.contacts.unmergeContact;
  getContactMergeHistory = this.contacts.getContactMergeHistory;

  // Deal / Registration Opportunity APIs
  getDeals = this.deals.getDeals;
  getDealsByCustomer = this.deals.getDealsByCustomer;
  getDealById = this.deals.getDealById;
  createDeal = this.deals.createDeal;
  updateDeal = this.deals.updateDeal;
  deleteDeal = this.deals.deleteDeal;

  // Message Storage & Retention APIs
  getMessageStorageMetrics = this.messageStorage.getMetrics;
  getMessageStoragePolicy = this.messageStorage.getPolicy;
  updateMessageStoragePolicy = this.messageStorage.updatePolicy;
  estimateMessageStoragePurge = this.messageStorage.estimatePurge;
  purgeStoredMessages = this.messageStorage.purgeMessages;
  triggerMessageRetentionNow = this.messageStorage.triggerRetentionNow;

  // Lead scoring
  getKeywordRules = this.keywordRules.getRules;
  createKeywordRule = this.keywordRules.createRule;
  updateKeywordRule = this.keywordRules.updateRule;
  deleteKeywordRule = this.keywordRules.deleteRule;
  getLeadScoringSettings = this.keywordRules.getScoringSettings;
  updateLeadScoringSettings = this.keywordRules.updateScoringSettings;
}

export const apiClient = new ApiClient();
export default apiClient;
