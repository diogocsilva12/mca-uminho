#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>

#include "my_papi.h"

#include "Challenge.h"
#include "Challenge0.h"

#define M_SIZE 512

static float Cube[M_SIZE*M_SIZE*M_SIZE] __attribute__((aligned (16)));
static float Res[M_SIZE] __attribute__((aligned (16)));
static float Res_ref[M_SIZE] __attribute__((aligned (16)));

static int ini_Cube (int );
static float my_rand (void);

static int verify_command_line (int argc, char *argv[], int *version);
static void print_usage (char *msg);
static int verify_result(int);

void (*func)(float *, float *, int);

// PAPI events to monitor
#define NUM_EVENTS 5
int Events[NUM_EVENTS] = { PAPI_TOT_CYC, PAPI_TOT_INS, PAPI_L1_DCM, PAPI_LD_INS, PAPI_SR_INS};

int main (int argc, char *argv[]) {
  int total_elements, version;
  int measurement_loop;

  if (!verify_command_line (argc, argv, &version)) {
	return 0;
  }
  total_elements = M_SIZE * M_SIZE * M_SIZE;

  fprintf (stdout, "The Cube is %d x %d x %d (%d elements)!\n", M_SIZE, M_SIZE, M_SIZE, total_elements);fflush(stdout);

  // Initialize PAPI 
  fprintf (stderr, "\nSetting up PAPI...");fflush(stderr);
  if (!MYPAPI_init (version, total_elements, NUM_EVENTS, Events)) {
    fprintf (stderr, "Error initializing PAPI!\n");
    return 0;
  }
  fprintf(stderr, "done!\n");fflush(stderr);

  // ini Cube
  fprintf (stderr, "Initializing Cube...");fflush(stderr);
  if (!ini_Cube (M_SIZE)) return 0;
  fprintf (stderr, "done!\n");fflush(stderr);

  fprintf (stdout, "Code version %d\n", version);fflush(stdout);

  for (measurement_loop=0 ; measurement_loop <= NUM_EVENTS-2 ; measurement_loop++) 
  {
    // warmup caches
    fprintf (stderr, "Warming up caches...");fflush(stderr);
    bzero (Res, M_SIZE*sizeof(float));
    func (Cube, Res, M_SIZE);
    fprintf (stderr, "done!\n");fflush(stderr);

    /* Start counting events */
    if (!MYPAPI_start(measurement_loop)) {
      fprintf (stderr, "PAPI error starting counters!\n");fflush(stderr);
      return 0;
    }

    bzero (Res, M_SIZE*sizeof(float));
    func (Cube, Res, M_SIZE);

    /* Stop counting events */
    if (!MYPAPI_stop(measurement_loop)) {
      fprintf (stderr, "PAPI error stoping counters!\n");fflush(stderr);
      return 0;
    }

  } // end measurement_loop
  
  MYPAPI_output (); fflush (stdout);

  // verify the results
  // generate reference
  fprintf (stderr, "Verification: generating the reference solution...");fflush(stderr);
  bzero (Res_ref, M_SIZE*sizeof(float));
  P06Challenge0 (Cube, Res_ref, M_SIZE);
  fprintf (stderr, "done!\n");fflush(stderr);

  // compare reference
  fprintf (stdout, "comparing reference solution with C...");fflush(stdout);
  if (verify_result (M_SIZE)) {
    fprintf (stdout, "  OK!\n");fflush(stdout);
  }
  else {
    fprintf (stdout, "  ERROR!\n");fflush(stdout);
  }
  

  printf ("\nThat's all, folks\n");
  return 1;
}

int verify_command_line (int argc, char *argv[], int *version) {
	int val;

	if (argc!=2) {
		print_usage ((char *)"Exactly 1 argument is required!");
		return 0;
	}

	val = atoi (argv[1]);

	if ((val < 0) || (val >4)) {
		print_usage ((char *)"The version of the function to use must be an integer between 1 and 4!");
		return 0;
	}
	else {
		*version = val;
		switch (*version) {
			case 1:
				func = &P06Challenge1;
				break;
			case 2:
				func = &P06Challenge2;
				break;
			case 3:
				func = &P06Challenge3;
				break;
			case 4:
				func = &P06Challenge4;
				break;
			case 0:
				func = &P06Challenge0;
				break;
		}
	}
		
	return 1;
}

void print_usage (char *msg) {
	fprintf (stderr, "Command Line Error! %s\n", msg);
	fprintf (stderr, "Usage:\tP06Challenge <version>\n\n");
}


//----------------------------------------------

//Initialization funcs...

static float my_rand (void) {
  double d;

  d = drand48 ();
  d *= 4.E0;
  return ((float)d);
}

static int ini_Cube (int N) {
 	int x,y,z;
	float *ptr;

	ptr = Cube;
	for (x=0 ; x<N ; x ++) {
	  for (y=0 ; y<N ; y ++) {
	    for (z=0 ; z<N ; z ++, ptr++) {
		*ptr = my_rand()+1.f;
	    }
	  }
	}
	return 1;
} 

// -------------------------------------------------------

//Result verification functions

/**
 * Function used to verify the result. No need to change this one.
 */
static int verify_result(int n) {
        float error, max_error;
        int ndx;

        error = max_error = 0.f;
        for (ndx = 0; ndx < n; ndx++) {
          error = fabs(Res_ref[ndx] - Res[ndx]);
	  error /= ((float) n*n);
	  if (error > max_error) max_error=error;
        }

        printf("error: %f", error);

        return (error < 1E0);
}

