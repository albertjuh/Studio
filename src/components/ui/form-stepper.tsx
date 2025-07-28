
"use client";

import * as React from "react";
import { useState, Children, isValidElement } from "react";
import type { UseFormReturn, FieldValues, FieldPath } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

interface FormStepProps {
  children: React.ReactNode;
  isOptional?: boolean;
}

export function FormStep({ children }: FormStepProps) {
  return <>{children}</>;
}

interface FormStepperProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  children: React.ReactNode;
  onSubmit: (data: T) => void;
  isLoading?: boolean;
  submitText?: string;
  submitIcon?: React.ReactNode;
}

export function FormStepper<T extends FieldValues>({
  form,
  children,
  onSubmit,
  isLoading = false,
  submitText = "Submit",
  submitIcon,
}: FormStepperProps<T>) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

  const steps = Children.toArray(children).filter(
    (child): child is React.ReactElement<FormStepProps> => isValidElement(child) && child.type === FormStep
  );

  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentStepElement = steps[currentStep];

  const getFieldsInStep = (stepElement: React.ReactElement<FormStepProps>): FieldPath<T>[] => {
    const fields: FieldPath<T>[] = [];
    Children.forEach(stepElement.props.children, (child) => {
      if (isValidElement(child) && child.props.name) {
        fields.push(child.props.name as FieldPath<T>);
      }
    });
    return fields;
  };

  const handleNext = async () => {
    const fieldsToValidate = getFieldsInStep(currentStepElement);
    const isValid = await form.trigger(fieldsToValidate);
    
    if (currentStepElement.props.isOptional || isValid) {
      if (currentStep < totalSteps - 1) {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Progress value={progress} className="h-2" />
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Step {currentStep + 1} / {totalSteps}
        </span>
      </div>

      <div className="relative overflow-hidden h-48 flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute w-full"
          >
            {currentStepElement}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {currentStep < totalSteps - 1 ? (
          <Button type="button" onClick={handleNext} disabled={isLoading}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : submitIcon}
            {submitText}
          </Button>
        )}
      </div>
    </div>
  );
}
