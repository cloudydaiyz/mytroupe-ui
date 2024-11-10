// Defines handlers to mocks the remote calls to the API from the API client, integrating functionality with MSW

import { http, HttpResponse, delay } from 'msw';
import type { Attendee, CreateEventRequest, CreateEventTypeRequest, CreateMemberRequest, EventType, PublicEvent, UpdateEventRequest, UpdateEventTypeRequest, UpdateMemberRequest, UpdateTroupeRequest } from '@cloudydaiyz/stringplay-core/types/api';
import { API_CLIENT_URL } from './constants';
import { defaultConfig } from './mock-data';
import { api } from './api-client';

type ParsedPathParams = { [param: string]: string };

function getUrl(uri: string, path: string) {
    return (new URL(path, uri)).href;
}

api.addCredentials("example", "tokens");
const mockConsole = defaultConfig;

export const mockGetConsoleData = http.get(
    getUrl(API_CLIENT_URL, "/t/:troupeId/console"), 
    async () => {
        console.log('intercepted request');
        await delay(800);
        return HttpResponse.json(mockConsole);
    }
);

export const mockGetTroupe = http.get(
    getUrl(API_CLIENT_URL, "/t/:troupeId"),
    async () => {
        return HttpResponse.json(mockConsole.troupe);
    }
);

export const mockUpdateTroupe = http.put(
    getUrl(API_CLIENT_URL, "/t/:troupeId"),
    async ({ request }) => {
        const body = await request.json() as UpdateTroupeRequest;
        if(body.name) mockConsole.troupe.name = body.name;
        if(body.updateMemberProperties) {
            // Skipping since this would impact multiple views and require more than surface level mocking
            console.warn("Skipping member properties update");
        }
        if(body.removeMemberProperties) {
            // Theoretically, the UI shouldn't let you remove the base member properties
            for(const prop of body.removeMemberProperties) {
                delete mockConsole.troupe.memberPropertyTypes[prop];
                for(const attendee of mockConsole.attendees) {
                    delete attendee.properties[prop];
                }
            }
        }
        if(body.updatePointTypes) {
            for(const pointType in body.updatePointTypes) {
                mockConsole.troupe.pointTypes[pointType] = {
                    startDate: body.updatePointTypes[pointType].startDate,
                    endDate: body.updatePointTypes[pointType].endDate,
                }
            }
        }
        if(body.removePointTypes) {
            // Theoretically, the UI shouldn't let you remove the base point types
            for(const pointType of body.removePointTypes) {
                delete mockConsole.troupe.pointTypes[pointType];
                for(const attendee of mockConsole.attendees) {
                    delete attendee.points[pointType];
                }
            }
        }
    }
);

export const mockCreateEvent = http.post(
    getUrl(API_CLIENT_URL, "/t/:troupeId/e"),
    async ({ request }) => {
        const body = await request.json() as CreateEventRequest;
        const newEvent: PublicEvent = {
            id: Date.now().toString(16),
            troupeId: mockConsole.troupe.id,
            lastUpdated: (new Date()).toISOString(),
            title: body.title,
            source: '',
            synchronizedSource: '',
            sourceUri: body.sourceUri,
            synchronizedSourceUri: '',
            startDate: body.startDate,
            fieldToPropertyMap: {},
            synchronizedFieldToPropertyMap: {},
            value: body.value || 0,
        };
        mockConsole.events.push(newEvent);
        return HttpResponse.json(newEvent);
    }
);

export const mockGetEvents = http.get(
    getUrl(API_CLIENT_URL, "/t/:troupeId/e"),
    async () => {
        return HttpResponse.json(mockConsole.events);
    }
);

export const mockUpdateEvent = http.put(
    getUrl(API_CLIENT_URL, "/t/:troupeId/e/:eventId"),
    async ({ params, request }) => {
        const { eventId } = params as ParsedPathParams;
        const body = await request.json() as UpdateEventRequest;
        const event = mockConsole.events.find(e => e.id == eventId);
        if(!event) {
            throw new Error('mockUpdateEvent: Invalid event');
        }

        if(body.eventTypeId) event.eventTypeId = body.eventTypeId;
        if(body.sourceUri) event.sourceUri = body.sourceUri;
        if(body.startDate) event.startDate = body.startDate;
        if(body.title) event.title = body.title;
        if(body.value) event.value = body.value;
        return HttpResponse.json(event);
    }
);

export const mockDeleteEvent = http.delete(
    getUrl(API_CLIENT_URL, "/t/:troupeId/e/:eventId"),
    async ({ params }) => {
        const { eventId } = params as ParsedPathParams;
        mockConsole.events = mockConsole.events.filter(e => e.id != eventId);
    }
);

export const mockCreateEventType = http.post(
    getUrl(API_CLIENT_URL, "/t/:troupeId/et"),
    async ({ request }) => {
        const body = await request.json() as CreateEventTypeRequest;
        const newEventType: EventType = {
            id: Date.now().toString(16),
            lastUpdated: (new Date()).toISOString(),
            title: body.title,
            value: body.value,
            sourceFolderUris: body.sourceFolderUris,
            synchronizedSourceFolderUris: [],
        };
        mockConsole.eventTypes.push(newEventType);
        return HttpResponse.json(mockConsole);
    }
);

export const mockGetEventTypes = http.get(
    getUrl(API_CLIENT_URL, "/t/:troupeId/et"),
    async () => {
        return HttpResponse.json(mockConsole.eventTypes);
    }
);

export const mockUpdateEventType = http.put(
    getUrl(API_CLIENT_URL, "/t/:troupeId/et/:eventTypeId"),
    async ({ params, request }) => {
        const { eventTypeId } = params as ParsedPathParams;
        const body = await request.json() as UpdateEventTypeRequest;
        const eventType = mockConsole.eventTypes.find(et => et.id == eventTypeId);
        if(!eventType) {
            throw new Error('mockUpdateEventType: Invalid event type');
        }

        if(body.title) eventType.title = body.title;
        if(body.value) eventType.value = body.value;
        if(body.addSourceFolderUris) {
            eventType.sourceFolderUris.push(...body.addSourceFolderUris);
        }
        if(body.removeSourceFolderUris) {
            eventType.sourceFolderUris.filter(uri => !body.removeSourceFolderUris!.includes(uri));
        }
        return HttpResponse.json(eventType);
    }
);

export const mockDeleteEventType = http.delete(
    getUrl(API_CLIENT_URL, "/t/:troupeId/et/:eventTypeId"),
    async ({ params }) => {
        const { eventTypeId } = params as ParsedPathParams;
        mockConsole.eventTypes = mockConsole.eventTypes.filter(et => et.id != eventTypeId);
    }
);

export const mockCreateMember = http.post(
    getUrl(API_CLIENT_URL, "/t/:troupeId/m"),
    async ({ request }) => {
        const body = await request.json() as CreateMemberRequest;
        const properties = {} as Attendee['properties'];
        for(const property in body.properties) {
            properties[property] = {
                value: body.properties[property],
                override: true,
            };
        }

        const newMember: Attendee = {
            id: Date.now().toString(16),
            troupeId: mockConsole.troupe.id,
            lastUpdated: (new Date()).toISOString(),
            points: {
                'Total': 0,
            },
            properties,
            eventsAttended: [],
        };
        mockConsole.attendees.push(newMember);
        return HttpResponse.json(newMember);
    }
);

export const mockGetAttendees = http.get(
    getUrl(API_CLIENT_URL, "/t/:troupeId/a"),
    async () => {
        return HttpResponse.json(mockConsole.attendees);
    }
)

export const mockUpdateMember = http.put(
    getUrl(API_CLIENT_URL, "/t/:troupeId/m/:memberId"),
    async ({ params, request }) => {
        const { memberId } = params as ParsedPathParams;
        const body = await request.json() as UpdateMemberRequest;
        const member = mockConsole.attendees.find(m => m.id == memberId);
        if(!member) {
            throw new Error('mockUpdateMember: Invalid event');
        }

        for(const property in body.updateProperties) {
            const value = body.updateProperties[property].value;
            const override = body.updateProperties[property].override;
            if(property in member.properties) {
                if(value) member.properties[property].value = value;
                if(override) member.properties[property].override = override;
            } else {
                if(!value) {
                    throw new Error('mockUpdateMember: Invalid properties');
                }
                member.properties[property] = {
                    value,
                    override: override || false,
                }
            }
        }

        for(const property of body.removeProperties || []) {
            delete member.properties[property];
        }

        return HttpResponse.json(member);
    }
);

export const mockDeleteMember = http.delete(
    getUrl(API_CLIENT_URL, "/t/:troupeId/m/:memberId"),
    async ({ params }) => {
        const { memberId } = params as ParsedPathParams;
        mockConsole.attendees = mockConsole.attendees.filter(m => m.id != memberId);
    }
);