// tslint:disable:max-line-length
import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { RequestsService } from '../services/requests.service';
import { Request } from '../models/request-model';
import { Message } from '../models/message-model';
// import { error } from 'util';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/takeWhile';

import 'rxjs/add/operator/finally';

import * as firebase from 'firebase/app';
// import { Response } from '@angular/http/src/static_response';
import { Headers } from '@angular/http/src/headers';
import { Response } from '@angular/http';

import * as moment from 'moment';
import 'moment/locale/it.js';

@Component({
  selector: 'requests-list',
  templateUrl: './requests-list.component.html',
  styleUrls: ['./requests-list.component.scss'],
})
export class RequestsListComponent implements OnInit {
  @ViewChild('scrollMe') private myScrollContainer: ElementRef;

  // user: Observable<User | null>;
  user: any;
  token: any;

  requestList: Request[];
  showSpinner = true;

  messagesList: Message[];

  display = 'none';

  // SCROLL TO BOTTON AND SCROLL POSITION
  displayBtnScrollToBottom = 'none';
  initialScrollPosition: number;
  initialMsgsArrayLength: number;

  // initScrollPositionHalf: number;
  // initScrollPositionPlusTwoScroll: number;

  requestRecipient: string;
  currentUserFireBaseUID: string;

  SHOW_JOIN_TO_GROUP_SPINNER_PROCESSING = false;
  HAS_COMPLETED_JOIN_TO_GROUP_POST_REQUEST = false;

  membersObjectInRequestArray: any;

  JOIN_TO_GROUP_HAS_ERROR = false;
  CURRENT_USER_IS_ALREADY_MEMBER = false;
  SEARCH_FOR_SAME_UID_FINISHED = false;

  request_timestamp: any;
  request_fromNow_date: any;
  id_request: string;

  constructor(
    private requestsService: RequestsService,
    private elRef: ElementRef,
  ) {

    this.user = firebase.auth().currentUser;
    // console.log('LOGGED USER ', this.user);
    if (this.user) {
      this.currentUserFireBaseUID = this.user.uid
      console.log('FIREBASE SIGNED IN USER UID GET IN REQUEST-LIST COMPONENT', this.currentUserFireBaseUID);
      this.getToken();
    } else {
      // console.log('No user is signed in');
    }
  }

  getToken() {
    const that = this;
    console.log('Notification permission granted.');
    firebase.auth().currentUser.getIdToken(/* forceRefresh */ true)
      .then(function (idToken) {
        that.token = idToken;
        console.log('idToken.', idToken);
      }).catch(function (error) {
        // Handle error
        console.log('idToken.', error);
      });
  }



  ngOnInit() {
    this.getRequestList();
  }

  // ngAfterViewInit() {
  //   // this.elRef.nativeElement.querySelector('.modal');
  //   console.log('MM ', this.elRef.nativeElement.querySelector('.modal').animate({ scrollTop: 0 }, 'slow') );
  // }

  /**
   * REQUESTS (on FIRESTORE the COLLECTION is 'CONVERSATIONS')
   */
  getRequestList() {
    // SUBSCIPTION TO snapshotChanges
    this.requestsService.getSnapshotConversations().subscribe((data) => {
      this.requestList = data;
      console.log('REQUESTS-LIST.COMP: SUBSCRIPTION TO REQUESTS getSnapshot ', data);

      let i: any;
      for (i = 0; i < this.requestList.length; i++) {
        // console.log('REQUEST TIMESTAMP ', this.requestList[i].timestamp)
        const timestampMs = this.requestList[i].timestamp / 1000
        this.request_fromNow_date = moment.unix(timestampMs).fromNow();
        // console.log('REQUEST FROM NOW DATE ', this.request_fromNow_date)
        this.id_request = this.requestList[i].recipient;

        for (const request of this.requestList) {
          if (this.id_request === request.recipient) {
            request.request_date_fromnow = this.request_fromNow_date;

            // console.log('+++ GET REQUEST LIST - REQUEST MEMBERS ', request.members )
          }
        }
      }

      this.showSpinner = false;

    },
      (err) => {

        console.log('GET REQUEST LIST ERROR ', err);

      },
      () => {
        console.log('GET REQUEST LIST * COMPLETE *');
        // this.showSpinner = false;
      });

  }




  // THE USER OPEN THE MODAL WINDOW:
  // * ON CLICK THE VIEW PASS THE VALUE OF 'RECIPIENT' THAT ASSIGN TO THE LOCAL VARIABLE this.requestRecipient
  // * GET THE MESSAGE LIST BY this.requestRecipient
  // * GET THE REQUEST DETAILS (GET THE CONVESATION BY RECIPIENT) - IS USED FOR:
  //   IF THE VALUE OF THE UID OF CURRENT USER IS FOUND BETWEEN THE UID KEY IN MEMBERS (is contained in the request object)
  //   IN THE MODAL WITH THE MSGS LIST THE 'ENTER BTN' (AND NOT THE 'JOIN BTN') WILL BE DISPLAYED
  openViewMsgsModal(recipient: string) {

    this.JOIN_TO_GROUP_HAS_ERROR = false;
    this.SEARCH_FOR_SAME_UID_FINISHED = false;

    this.display = 'block';
    console.log(' ++ ++ request recipient ', recipient);

    this.requestRecipient = recipient;

    this.getRequestByRecipient()

    this.getMessagesList();

    // .animate({ scrollTop: 0, duration: 100 })
    this.msgLenght();
    // SCROOL TO BOTTOM THE MESSAGES LIST WHEN THE MODAL IS OPEN
    setTimeout(() => {
      this.scrollToBottom();
    }, 1000);

    /**
     *  *** SCROLL TOP - SCROLL HEIGHT - VISIBLE CONTENT HEIGHT ***
     * scrollTop - sets or return the vertical scrollbar position
     * scrollHeight - read-only property is a measurement of the height of an element content, including content not visible due to overflow
     * height of visible content is set to 250px in the view
     */
    // SET IN A VARIABLE THE INITIAL SCROLL POSITION (FORCED TO BOTTOM OF THE VISIBLE CONTENT AREA WITH THE PREVIOUS scrollToBottom())
    // WHEN THE USER MOVE UPWARDS THE SCROLLBAR THE SCROLL POSITION VALUE DECREASES UP TO 0
    setTimeout(() => {
      this.initialScrollPosition = this.myScrollContainer.nativeElement.scrollTop;
      console.log('SCROLL POSITION WHEN MODAL IS OPEN (INITIAL SCROLL POSITION) ', this.initialScrollPosition);
      // console.log(' SCROLL HEIGHT ', this.myScrollContainer.nativeElement.scrollHeight);
      // console.log(' SCROLL TOP (ALIAS SCROLL POSITION) )', this.myScrollContainer.nativeElement.scrollTop);
      // this.initScrollPositionHalf = this.myScrollContainer.nativeElement.scrollTop / 2;
      // console.log('SCROLL POSITION / 2 WHEN MODAL IS OPEN ', this.initScrollPositionHalf);
      // this.initScrollPositionPlusTwoScroll = this.myScrollContainer.nativeElement.scrollTop + 320;
      // console.log('SCROLL POSITION / 2 WHEN MODAL IS OPEN ', this.initScrollPositionHalf);

    }, 300);

  }

  /**
   * MESSAGES (on FIRESTORE the COLLECTION is 'MESSAGES')
   */
  getMessagesList() {
    // SUBSCIPTION TO snapshotChanges
    this.requestsService.getSnapshotMsg(this.requestRecipient)
      // .finally(() => {
      //   console.log('- -- -- FINISH TO GET MESSAGE !!');
      // })
      .subscribe((data) => {
        this.messagesList = data;
        console.log('REQUESTS-LIST.COMP: SUBSCRIPTION TO getSnapshot MSG ', data);
        // this.showSpinner = false;
        // console.log('TIMESTAMP ', this.messagesList);
        // if (data.length) {
        // this.scrollToBottom();
        // }
      },
      (err) => {
        console.log('GET MESSAGE LIST ERROR ', err);
      },
      () => {
        console.log('GET MESSAGE LIST * COMPLETE *');
        // this.showSpinner = false;
      });

  }

  // GET REQUEST DETAIL (IS THE REQUEST CORRESPONDING TO THE ROW OF REQUESTS LIST ON WHICH THE USER CLICK)
  // THEN IN THE ARRAY RETURNED GET THE 'UID KEYS' CONTAINED IN THE OBJECT MEMBERS
  // THEN COMPARE ANY 'UID KEY' WITH THE CURRENT USER UID
  // IF THE 'UID KEY' IS = TO 'CURRENT USER ID' SHOWS THE BUTTON ENTER AND NOT THE BUTTON JOIN
  getRequestByRecipient() {
    this.requestsService.getSnapshotConversationByRecipient(this.requestRecipient)
      .subscribe((request) => {

        console.log('REQUEST (ALIAS CONVERSATION) GET BY RECIPIENT ', request);

        this.membersObjectInRequestArray = request[0].members;
        console.log('OBJECT MEMBERS IN THIS REQUEST ', this.membersObjectInRequestArray);

        const uidKeysInMemberObject = Object.keys(this.membersObjectInRequestArray)
        console.log('UID KEYS CONTAINED IN MEMBER OBJECT ', Object.keys(this.membersObjectInRequestArray))

        const lengthOfUidKeysInMemberObject = uidKeysInMemberObject.length;
        console.log('LENGHT OF UID KEY CONTAINED IN MEMBER OBJECT ', lengthOfUidKeysInMemberObject)

        let i: number;
        for (i = 0; i < lengthOfUidKeysInMemberObject; i++) {
          const uidKey = uidKeysInMemberObject[i];
          // console.log('UID KEY ', uidKey)
          if (uidKey === this.currentUserFireBaseUID) {

            // console.log('THE CURRENT USER IS ALREADY JOINED TO THIS CONVERSATION - SHOW BTN ENTER')
            console.log('THE MEMBER UID: ', uidKey, '  IS === TO CURRENT USER UID - SHOW BTN ENTER')
            this.CURRENT_USER_IS_ALREADY_MEMBER = true;
            this.HAS_COMPLETED_JOIN_TO_GROUP_POST_REQUEST = false

            this.SEARCH_FOR_SAME_UID_FINISHED = true;
            break;


          } else {
            // console.log('THE CURRENT USER !IS NOT JOINED TO THIS CONVERSATION - SHOW BTN JOIN')
            console.log('THE MEMBER UID: ', uidKey, '  IS !== TO CURRENT USER UID - SHOW BTN JOIN')
            this.CURRENT_USER_IS_ALREADY_MEMBER = false;
            this.HAS_COMPLETED_JOIN_TO_GROUP_POST_REQUEST = false
            console.log('CYCLE NUMBER ', i)
            if (i + 1 === lengthOfUidKeysInMemberObject) {
              console.log('END OF LOOP')
              this.SEARCH_FOR_SAME_UID_FINISHED = true;
            }
          }
        }
      },
      (err) => {
        this.SEARCH_FOR_SAME_UID_FINISHED = true;
        console.log('REQUEST (ALIAS CONVERSATION) GET BY RECIPIENT ERROR ', err);
      },
      () => {
        console.log('REQUEST (ALIAS CONVERSATION) GET BY RECIPIENT COMPLETE');
      });
  }

  // JOIN TO CHAT GROUP
  onJoinHandled() {

    console.log('JOIN PRESSED');
    this.SHOW_JOIN_TO_GROUP_SPINNER_PROCESSING = true;
    // this.requestsService.joinToGroup(this.currentUserFireBaseUID, this.requestRecipient)
    this.requestsService.joinToGroup(this.requestRecipient, this.token, this.currentUserFireBaseUID)
      .subscribe((data: any) => {

        console.log('JOIN TO CHAT GROUP ', data);
      },
      (err) => {
        console.log('JOIN TO CHAT GROUP ERROR ', err);
        this.SHOW_JOIN_TO_GROUP_SPINNER_PROCESSING = false;
        this.HAS_COMPLETED_JOIN_TO_GROUP_POST_REQUEST = false;
        this.JOIN_TO_GROUP_HAS_ERROR = true;


      },
      () => {
        console.log('JOIN TO CHAT GROUP COMPLETE', );

        this.SHOW_JOIN_TO_GROUP_SPINNER_PROCESSING = false;
        this.HAS_COMPLETED_JOIN_TO_GROUP_POST_REQUEST = true;
      });

  }

  // LISTEN TO SCROLL POSITION
  onScroll(event: any): void {
    const scrollPosition = this.myScrollContainer.nativeElement.scrollTop;

    const scrollHeight = this.myScrollContainer.nativeElement.scrollHeight;
    console.log('ON SCROLL - SCROLL POSITION ', scrollPosition);
    console.log('ON SCROLL - SCROLL HEIGHT ', scrollHeight);

    /* scrollHeighLessScrollPosition */
    // IS EQUAL TO 250 (HEIGHT OF THE VISIBLE AREA) WHEN THE SCROLLBAR IS AT THE BOTTOM
    // IS EQUAL TO SCROLL HEIGHT (VISIBLE AREA + OVERFLOW) WHEN THE SCROLLBAR IS AT THE TOP
    const scrollHeighLessScrollPosition = scrollHeight - scrollPosition;
    console.log('ON SCROLL - SCROLL OVERFLOW ', scrollHeighLessScrollPosition);
    // console.log('ON SCROLL - SCROLL POSITION / 2 WHEN MODAL IS OPEN ', this.initScrollPositionHalf);

    // const scrollPositionHalf = this.myScrollContainer.nativeElement.scrollTop / 2;
    // console.log('ON SCROLL - SCROLL POSITION HALF ', scrollPositionHalf);

    const currentScrollPosition = this.myScrollContainer.nativeElement.scrollTop;

    // scrollDifference ASSUME THAT initScrollPosition IS CALCULATE WITH THE SCROLLBAR FORCED TO BOTTOM
    const scrollDifference = this.initialScrollPosition - currentScrollPosition;
    console.log('SCROLL DIFFERENCE (INIT SCROLL POSITION - CURRENT SCROLL POSITION)', scrollDifference);

    // 320 IS +/- THE HEIGHT CONSUMED WITH TWO SCROLL
    if (scrollDifference >= 320) {
      this.displayBtnScrollToBottom = 'block';
    }
    if (scrollHeighLessScrollPosition === 250 || scrollDifference <= 320) {
      this.displayBtnScrollToBottom = 'none';
    }
    console.log('ON SCROLL - initial MSGS ARRAY LENGTH ', this.initialMsgsArrayLength);

  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
      console.log('RUN SCROLL TO BOTTOM - SCROLL TOP ', this.myScrollContainer.nativeElement.scrollHeight, ' SCROLL HEIGHT ', this.myScrollContainer.nativeElement.scrollHeight);
    } catch (err) {
      console.log('ERROR ', err);
    }
  }

  // bottomFunction() {
  //   const objDiv = document.getElementById('scrollMe');
  //   console.log('objDiv ::', objDiv);
  //   if (objDiv) {
  //     objDiv.scrollIntoView(false);
  //     // objDiv.scrollToBottom()
  //   }
  // }

  msgLenght() {
    this.requestsService.getSnapshotMsg(this.requestRecipient)
      .subscribe((data) => {
        this.initialMsgsArrayLength = data.length;
        console.log('WHEN OPEN MODAL MSGS ARRAY LENGHT (FIXED) ', this.initialMsgsArrayLength);

      });

  }



  // CLOSE MODAL
  onCloseModal() {
    this.display = 'none';
  }


}